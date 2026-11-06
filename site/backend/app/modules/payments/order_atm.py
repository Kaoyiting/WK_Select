"""STAGE only member checkout, payment synchronization and expiry reconciliation."""
import secrets
import time
from datetime import datetime,timedelta,time as day_time
from zoneinfo import ZoneInfo
from urllib.parse import parse_qsl
import httpx
from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.exceptions import fail
from app.core.security import now
from app.core.locks import order_lock
from app.integrations.ecpay import STAGE_MERCHANT_ID,check_mac,valid_mac
from app.modules.orders.models import Order
from .models import AtmSandboxTransaction,Payment
from . import sandbox

TZ=ZoneInfo("Asia/Taipei")

def enabled():
    c=settings()
    return c.app_env!="production" and c.ecpay_order_testing_enabled and c.ecpay_sandbox_enabled

def require_order_testing():
    if not enabled():
        fail("PAYMENT_DISABLED","ATM 訂單測試尚未啟用",409)
    if not sandbox.callback_origin():
        fail("PAYMENT_DISABLED","尚未設定公開 HTTPS 測試通知網址",409)

def initialize(db,o):
    require_order_testing()
    if not 16<=o.total_amount<=49999:
        fail("PAYMENT_AMOUNT_INVALID","ATM 測試金額須介於 NT$16 與 NT$49,999",422)
    o.payment_deadline=datetime.combine(now().astimezone(TZ).date()+timedelta(days=1),day_time(23,59,59),TZ)
    db.add(AtmSandboxTransaction(order_id=o.id,admin_id=None,merchant_trade_no="WKO"+secrets.token_hex(8).upper(),amount=o.total_amount,expire_days=1,source="ecpay_stage",created_at=now()))

def sync_order(db,t,fields,kind):
    if not t.order_id:
        return
    o=db.get(Order,t.order_id,populate_existing=True)
    if not o or not o.is_test:
        fail("PAYMENT_MISMATCH","測試通知不得更新正式訂單",409)
    p=db.scalar(select(Payment).where(Payment.order_id==o.id).with_for_update())
    if kind=="info" and fields.get("RtnCode")=="2":
        # Provider deadline is authoritative once a real STAGE account is obtained.
        o.payment_deadline=datetime.combine(datetime.strptime(t.expires_on,"%Y/%m/%d").date(),day_time(23,59,59),TZ)
    if kind=="notify" and fields.get("RtnCode")=="1":
        if p.status!="paid":
            p.status="paid"
            p.paid_at=t.paid_at
            p.reference="ECPay STAGE "+t.provider_trade_no
            p.version+=1
            if o.status=="cancelled":
                o.status="manual_review"
            o.version+=1
    db.flush()

def prepare_checkout(db,o,return_origin):
    require_order_testing()
    order_lock(db,o.id)
    db.refresh(o)
    p=db.scalar(select(Payment).where(Payment.order_id==o.id))
    if not o.is_test or o.payment_method!="ecpay_atm_test" or o.status not in {"pending","confirmed"} or p.status!="unpaid" or o.payment_deadline<=now():
        fail("INVALID_TRANSITION","此訂單無法繼續付款",409)
    t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id==o.id).with_for_update())
    if t.status!="created":
        fail("ACCOUNT_EXISTS","此訂單已取號，請使用會員中心顯示的帳號",409)
    # A stable transaction number ensures retry cannot create a second payable account.
    result=sandbox.checkout(t)
    t.submitted_at=now()
    result["fields"]["ClientBackURL"]=return_origin+"/#member"
    result["fields"]["CheckMacValue"]=check_mac(result["fields"])
    db.commit()
    return result

def query_stage(t):
    fields={"MerchantID":STAGE_MERCHANT_ID,"MerchantTradeNo":t.merchant_trade_no,"TimeStamp":str(int(time.time()))}
    fields["CheckMacValue"]=check_mac(fields)
    with httpx.Client(timeout=30) as client:
        r=client.post("https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5",data=fields)
        r.raise_for_status()
    if len(r.content)>16384:
        raise ValueError("oversized response")
    pairs=parse_qsl(r.text,keep_blank_values=True,max_num_fields=100)
    data=dict(pairs)
    if len(data)!=len(pairs) or not valid_mac(data) or data.get("MerchantID")!=STAGE_MERCHANT_ID or data.get("MerchantTradeNo")!=t.merchant_trade_no or data.get("TradeAmt")!=str(t.amount):
        raise ValueError("unverified provider response")
    if data.get("TradeStatus") not in {"0","1","10200095"}:
        raise ValueError("unknown provider status")
    return data

def expire_one(db,order_id,query=query_stage):
    from app.modules.orders.service import transition
    from app.modules.orders.schemas import Transition
    from app.modules.audit.service import record
    order_lock(db,order_id)
    o=db.get(Order,order_id,populate_existing=True)
    if not o or not o.is_test or o.status not in {"pending","confirmed"} or not o.payment_deadline or o.payment_deadline>=now():
        return False
    p=db.scalar(select(Payment).where(Payment.order_id==o.id).with_for_update())
    if p.status!="unpaid":
        return False
    t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.order_id==o.id).with_for_update())
    # Query before releasing stock: failed/unreachable reconciliation leaves the order untouched.
    data=query(t) if t.submitted_at or t.provider_trade_no else {"TradeStatus":"10200095"}
    if data.get("TradeStatus")=="1":
        fields=dict(data,RtnCode="1")
        fields["CheckMacValue"]=check_mac(fields)
        sandbox.receive(db,fields,"notify","ecpay_stage")
        record(db,None,"payment.stage.reconciled",o.id)
        return False
    transition(db,o.id,Transition(to_status="cancelled",expected_version=o.version,reason="ATM 繳費期限已過"))
    record(db,None,"order.payment_expired",o.id)
    return True

def expiry_pass():
    if not enabled():
        return
    with SessionLocal() as db:
        ids=list(db.scalars(select(Order.id).where(Order.is_test.is_(True),Order.payment_method=="ecpay_atm_test",Order.status.in_(["pending","confirmed"]),Order.payment_deadline<now()).limit(100)))
    for id in ids:
        with SessionLocal() as db:
            try:
                expire_one(db,id)
                db.commit()
            except Exception:
                db.rollback()
                import logging
                logging.warning("ATM expiry reconciliation deferred order=%s",id)
