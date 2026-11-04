from datetime import datetime
from urllib.parse import urlencode
import pytest
from sqlalchemy import select,func
from conftest import authenticate
from app.core.config import settings
from app.core.database import SessionLocal
from app.integrations.ecpay import check_mac,STAGE_MERCHANT_ID
from app.modules.payments.models import AtmSandboxTransaction,Payment
from app.modules.orders.models import Order

@pytest.fixture(autouse=True)
def enable(monkeypatch):
    monkeypatch.setattr(settings(),"ecpay_sandbox_enabled",True)
    monkeypatch.setattr(settings(),"ecpay_sandbox_callback_origin","")

def create(client,seeded):
    headers=authenticate(client,seeded["owner"],"admin")
    headers["Idempotency-Key"]="sandbox-test-1"
    r=client.post("/api/v1/admin/payments/sandbox",headers=headers,json={"amount":100,"expire_days":3})
    assert r.status_code==201,r.text
    return r.json()["data"],headers

def test_official_mac_vector():
    fields=dict(TradeDesc="促銷方案",PaymentType="aio",MerchantTradeDate="2023/03/12 15:30:23",MerchantTradeNo="ecpay20230312153023",MerchantID="3002607",ReturnURL="https://www.ecpay.com.tw/receive.php",ItemName="Apple iphone 15",TotalAmount="30000",ChoosePayment="ALL",EncryptType="1")
    assert check_mac(fields)=="6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840"

def test_admin_csrf_and_isolation(client,seeded):
    assert client.post("/api/v1/admin/payments/sandbox",json={"amount":100}).status_code==401
    t,h=create(client,seeded)
    assert client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/simulate",json={"event":"info"}).status_code==403
    for event in ["info","paid","info","paid"]:
        r=client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/simulate",headers=h,json={"event":event})
        assert r.status_code==200,r.text
    assert r.json()["data"]["status"]=="paid"
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Order))==0
        assert db.scalar(select(func.count()).select_from(Payment))==0
        assert db.get(AtmSandboxTransaction,t["id"]).paid_at

def test_idempotent_and_no_local_redirect(client,seeded):
    t,h=create(client,seeded)
    r=client.post("/api/v1/admin/payments/sandbox",headers=h,json={"amount":100,"expire_days":3})
    assert r.json()["data"]["id"]==t["id"]
    assert client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/checkout",headers=h).status_code==409

def signed(t,**overrides):
    fields=dict(MerchantID=STAGE_MERCHANT_ID,MerchantTradeNo=t["merchant_trade_no"],TradeAmt="100",PaymentType="ATM_TAISHIN",TradeNo="1234567890",RtnCode="2",BankCode="812",vAccount="1234567890123456",ExpireDate="2026/11/01")
    fields.update(overrides)
    fields["CheckMacValue"]=check_mac(fields)
    return fields

def callback(client,fields,kind="info"):
    return client.post("/api/v1/payments/sandbox/ecpay/"+kind,content=urlencode(fields),headers={"Content-Type":"application/x-www-form-urlencoded"})

def test_stage_guards_and_notifications(client,seeded,monkeypatch):
    t,h=create(client,seeded)
    monkeypatch.setattr(settings(),"ecpay_sandbox_callback_origin","https://payments.example.invalid")
    r=client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/checkout",headers=h)
    assert r.status_code==200,r.text
    assert r.json()["data"]["action"].startswith("https://payment-stage.ecpay.com.tw/")
    assert r.json()["data"]["fields"]["ChoosePayment"]=="ATM"
    fields=signed(t)
    bad=dict(fields,TradeAmt="999")
    assert callback(client,bad).status_code==400
    assert callback(client,signed(t,TradeAmt="999")).status_code==400
    assert callback(client,signed(t,MerchantID="999")).status_code==400
    assert callback(client,signed(t,PaymentType="Credit_CreditCard")).status_code==400
    assert callback(client,fields).text=="1|OK"
    assert callback(client,fields).text=="1|OK"
    assert callback(client,signed(t,BankCode="000")).status_code==400
    for _ in range(2):
        assert callback(client,signed(t,RtnCode="1",SimulatePaid="1"),"notify").text=="1|OK"
    assert callback(client,fields).text=="1|OK"
    with SessionLocal() as db:
        record=db.get(AtmSandboxTransaction,t["id"])
        paid_at=record.paid_at
        assert record.status=="paid"
    assert callback(client,signed(t,RtnCode="0"),"notify").text=="1|OK"
    with SessionLocal() as db:
        record=db.get(AtmSandboxTransaction,t["id"])
        assert record.status=="paid" and record.paid_at==paid_at
    assert client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/simulate",headers=h,json={"event":"paid"}).status_code==409

def test_paid_before_info(client,seeded,monkeypatch):
    t,h=create(client,seeded)
    monkeypatch.setattr(settings(),"ecpay_sandbox_callback_origin","https://payments.example.invalid")
    client.post(f"/api/v1/admin/payments/sandbox/{t['id']}/checkout",headers=h)
    assert callback(client,signed(t,RtnCode="1"),"notify").status_code==200
    assert callback(client,signed(t)).status_code==200
    with SessionLocal() as db:
        assert db.get(AtmSandboxTransaction,t["id"]).status=="paid"

def test_production_disabled(client,seeded,monkeypatch):
    h=authenticate(client,seeded["owner"],"admin")
    monkeypatch.setattr(settings(),"app_env","production")
    assert client.get("/api/v1/admin/payments/sandbox",headers=h).status_code==404
    assert callback(client,{}).status_code==404
