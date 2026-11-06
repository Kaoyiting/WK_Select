import concurrent.futures
from datetime import timedelta
from urllib.parse import urlencode
import pytest
from sqlalchemy import select
from fastapi import HTTPException
from conftest import authenticate
from app.core.config import settings
from app.core.security import now
from app.core.database import SessionLocal
from app.integrations.ecpay import check_mac,STAGE_MERCHANT_ID
from app.modules.auth.models import Member
from app.modules.orders.models import Order
from app.modules.orders.schemas import Transition,ShipmentInput
from app.modules.orders.service import create_order,transition,ship
from app.modules.payments.models import Payment,AtmSandboxTransaction
from app.modules.payments import sandbox
from app.modules.payments.order_atm import expire_one
from app.modules.catalog.models import Variant
from test_commerce import order_payload

@pytest.fixture(autouse=True)
def config(monkeypatch):
    monkeypatch.setattr(settings(),"ecpay_order_testing_enabled",True)
    monkeypatch.setattr(settings(),"ecpay_sandbox_enabled",True)
    monkeypatch.setattr(settings(),"ecpay_sandbox_callback_origin","https://test.example.invalid")

def make(ids,pre=False):
    with SessionLocal() as db:
        payload=order_payload(ids["prevariant"] if pre else ids["variant"],2280 if pre else 1060)
        payload.shipping_method="711_prepaid"
        payload.payment_method="ecpay_atm_test"
        result=create_order(db,db.get(Member,ids["member"]),payload)
        db.commit()
        t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id==result["id"]))
        return result,t.merchant_trade_no

def fields(trade,code="2",amount="1060"):
    f=dict(MerchantID=STAGE_MERCHANT_ID,MerchantTradeNo=trade,TradeAmt=amount,PaymentType="ATM_CATHAY",TradeNo="12345678901234",RtnCode=code,BankCode="013",vAccount="1234567890123456",ExpireDate="2026/11/01",SimulatePaid="1")
    f["CheckMacValue"]=check_mac(f)
    return f

def notify(trade,code="2",amount="1060"):
    with SessionLocal() as db:
        sandbox.receive(db,fields(trade,code,amount),"info" if code=="2" else "notify","ecpay_stage")
        db.commit()

def overdue(id):
    with SessionLocal() as db:
        t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id==id))
        t.submitted_at=now()
        db.get(Order,id).payment_deadline=now()-timedelta(seconds=1)
        db.commit()

def test_checkout_auth_amount_expiry_and_isolation(client,seeded):
    o,trade=make(seeded)
    assert o["is_test"] and o["atm"]["merchant_trade_no"]==trade
    url=f"/api/v1/orders/{o['id']}/atm-checkout"
    assert client.post(url).status_code==401
    h=authenticate(client,seeded["member"],"member")
    r=client.post(url,headers=h)
    assert r.status_code==200,r.text
    f=r.json()["data"]["fields"]
    assert f["ExpireDate"]=="1" and f["TotalAmount"]=="1060" and f["ClientBackURL"].endswith("/#member")
    assert f["ChoosePayment"]=="ATM"
    assert r.json()["data"]["action"].startswith("https://payment-stage.")
    with SessionLocal() as db:
        assert db.get(Variant,seeded["variant"]).stock_qty==0
    notify(trade)
    r=client.get("/api/v1/orders/"+o["id"])
    assert r.json()["data"]["atm"]["bank_code"]=="013"
    from datetime import datetime
    from zoneinfo import ZoneInfo
    deadline=datetime.fromisoformat(r.json()["data"]["payment_deadline"]).astimezone(ZoneInfo("Asia/Taipei"))
    assert deadline.strftime("%Y-%m-%d %H:%M:%S")=="2026-11-01 23:59:59"
    assert client.post(url,headers=h).status_code==409

def test_notifications_replay_and_wrong_amount(client,seeded):
    o,trade=make(seeded)
    f=fields(trade,"1")
    bad=dict(f,TradeAmt="1")
    assert client.post("/api/v1/payments/sandbox/ecpay/notify",content=urlencode(bad),headers={"Content-Type":"application/x-www-form-urlencoded"}).status_code==400
    notify(trade)
    notify(trade,"1")
    with SessionLocal() as db:
        p=db.scalar(select(Payment).where(Payment.order_id==o["id"]))
        version=p.version
        assert p.status=="paid" and db.get(Order,o["id"]).status=="pending"
    notify(trade,"1")
    notify(trade)
    with SessionLocal() as db:
        assert db.scalar(select(Payment).where(Payment.order_id==o["id"])).version==version
        assert db.get(Variant,seeded["variant"]).stock_qty==0

def test_expiry_restocks_once_and_late_paid_review(seeded):
    o,trade=make(seeded)
    notify(trade)
    overdue(o["id"])
    for i in range(2):
        with SessionLocal() as db:
            assert expire_one(db,o["id"],query=lambda t:{"TradeStatus":"0"}) is (i==0)
            db.commit()
    notify(trade,"1")
    notify(trade,"1")
    with SessionLocal() as db:
        assert db.get(Order,o["id"]).status=="manual_review"
        assert db.get(Variant,seeded["variant"]).stock_qty==1
        assert db.scalar(select(Payment).where(Payment.order_id==o["id"])).status=="paid"

def test_preorder_expiry_and_manual_cancel_late_payment(seeded):
    o,trade=make(seeded,True)
    with SessionLocal() as db:
        transition(db,o["id"],Transition(to_status="cancelled",expected_version=o["version"]))
        db.commit()
    notify(trade,"1","2280")
    with SessionLocal() as db:
        assert db.get(Order,o["id"]).status=="manual_review"
        assert db.get(Variant,seeded["prevariant"]).stock_qty is None

def test_query_failure_keeps_stock_reserved(seeded):
    o,trade=make(seeded)
    overdue(o["id"])
    with SessionLocal() as db:
        with pytest.raises(ValueError):
            expire_one(db,o["id"],query=lambda t:(_ for _ in ()).throw(ValueError("offline")))
        db.rollback()
        assert db.get(Order,o["id"]).status=="pending"
        assert db.get(Variant,seeded["variant"]).stock_qty==0

def test_query_detects_paid_before_cancel(seeded):
    o,trade=make(seeded)
    overdue(o["id"])
    with SessionLocal() as db:
        data=dict(fields(trade,"1"),TradeStatus="1")
        assert expire_one(db,o["id"],query=lambda t:data) is False
        db.commit()
        assert db.get(Order,o["id"]).status=="pending"
        assert db.get(Variant,seeded["variant"]).stock_qty==0
        assert db.scalar(select(Payment).where(Payment.order_id==o["id"])).status=="paid"

def test_concurrent_cancel_and_callback_serialized(seeded):
    o,trade=make(seeded)
    def cancel():
        with SessionLocal() as db:
            transition(db,o["id"],Transition(to_status="cancelled",expected_version=o["version"]))
            db.commit()
    # Force cancellation before payment, then concurrent repeat cancellation/notifications.
    cancel()
    def pay(_): notify(trade,"1")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(pay,range(2)))
    with SessionLocal() as db:
        assert db.get(Variant,seeded["variant"]).stock_qty==1
        assert db.get(Order,o["id"]).status=="manual_review"

def test_stage_order_disabled_in_production(client,seeded,monkeypatch):
    monkeypatch.setattr(settings(),"app_env","production")
    with pytest.raises(HTTPException): make(seeded)
    assert client.get("/api/v1/payments/options").json()["data"]["atm_test_enabled"] is False


def test_other_member_cannot_access_atm_checkout(client,seeded):
    o,trade=make(seeded)
    with SessionLocal() as db:
        other=Member(google_sub="other-atm-member",email="other@example.invalid",display_name="Other")
        db.add(other);db.commit();id=other.id
    h=authenticate(client,id,"member")
    assert client.get("/api/v1/orders/"+o["id"]).status_code==404
    assert client.post(f"/api/v1/orders/{o['id']}/atm-checkout",headers=h).status_code==404

def test_never_submitted_expires_without_provider_call(seeded):
    o,trade=make(seeded)
    with SessionLocal() as db:
        db.get(Order,o["id"]).payment_deadline=now()-timedelta(seconds=1)
        db.commit()
        assert expire_one(db,o["id"],query=lambda t:(_ for _ in ()).throw(AssertionError("must not query")))
        db.commit()
        assert db.get(Variant,seeded["variant"]).stock_qty==1

def test_test_orders_cannot_ship_or_confirm_real_money(client,seeded):
    o,trade=make(seeded)
    notify(trade,"1")
    with SessionLocal() as db:
        order=db.get(Order,o["id"])
        transition(db,o["id"],Transition(to_status="confirmed",expected_version=order.version))
        db.commit()
        with pytest.raises(HTTPException):
            ship(db,o["id"],ShipmentInput(tracking_number="QA-ONLY",all_items_ready_confirmed=True,expected_version=order.version),None)
    h=authenticate(client,seeded["owner"],"admin")
    h["Idempotency-Key"]="real-confirm-forbidden"
    assert client.post(f"/api/v1/admin/payments/{o['payment']['id']}/confirm",headers=h,json={"amount":1060,"expected_version":1,"reference":"QA"}).status_code==409

def test_provider_payment_time_preserved(seeded):
    o,trade=make(seeded)
    f=fields(trade,"1")
    f["PaymentDate"]="2026/10/29 12:30:45"
    f["CheckMacValue"]=check_mac(f)
    with SessionLocal() as db:
        sandbox.receive(db,f,"notify","ecpay_stage");db.commit()
        p=db.scalar(select(Payment).where(Payment.order_id==o["id"]))
        from zoneinfo import ZoneInfo
        assert p.paid_at.astimezone(ZoneInfo("Asia/Taipei")).strftime("%H:%M:%S")=="12:30:45"


def test_admin_accelerated_expiry(client,seeded):
    o,trade=make(seeded)
    h=authenticate(client,seeded["owner"],"admin")
    listing=client.get("/api/v1/admin/payments/order-tests")
    assert listing.status_code==200,listing.text
    assert any(x["id"]==o["id"] for x in listing.json()["data"])
    url=f"/api/v1/admin/payments/order-tests/{o['id']}/expire"
    assert client.post(url).status_code==403
    result=client.post(url,headers=h)
    assert result.status_code==200,result.text
    assert result.json()["data"]["status"]=="cancelled"
    assert client.post(url,headers=h).status_code==409
    with SessionLocal() as db:
        assert db.get(Variant,seeded["variant"]).stock_qty==1


def test_member_cannot_accelerate_expiry(client,seeded):
    o,trade=make(seeded)
    h=authenticate(client,seeded["member"],"member")
    assert client.post(f"/api/v1/admin/payments/order-tests/{o['id']}/expire",headers=h).status_code==401
