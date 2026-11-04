"""Admin-only local exercises and stage callbacks, isolated from commerce records."""
import re
import secrets
from datetime import timedelta
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
from sqlalchemy import select
from app.core.config import settings
from app.core.exceptions import fail
from app.core.security import now
from app.integrations.ecpay import STAGE_MERCHANT_ID, STAGE_CHECKOUT, check_mac, valid_mac
from .models import AtmSandboxTransaction


def require_sandbox():
    c = settings()
    if c.app_env == "production" or not c.ecpay_sandbox_enabled:
        fail("NOT_FOUND", "測試功能未啟用", 404)


def callback_origin():
    origin = settings().ecpay_sandbox_callback_origin.rstrip("/")
    url = urlsplit(origin)
    if not origin:
        return ""
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.path or url.query or url.fragment or url.hostname in {"localhost", "127.0.0.1"}:
        fail("CONFIGURATION_ERROR", "測試通知網址須為公開 HTTPS 網址，不含路徑", 409)
    return origin


def serialize(t):
    return {k: getattr(t,k) for k in ["id","merchant_trade_no","amount","expire_days","status","source","provider_trade_no","bank_code","virtual_account","expires_on"]} | {"created_at":t.created_at.isoformat(),"paid_at":t.paid_at.isoformat() if t.paid_at else None}


def create(db, admin, payload):
    t = AtmSandboxTransaction(admin_id=admin.id,merchant_trade_no="WKT"+secrets.token_hex(8).upper(),amount=payload.amount,expire_days=payload.expire_days,created_at=now())
    db.add(t)
    db.flush()
    return t


def checkout(t):
    origin = callback_origin()
    if not origin:
        fail("CALLBACK_URL_REQUIRED", "目前只能本機模擬；設定 HTTPS 測試網址後才能前往綠界取號",409)
    fields = {"MerchantID":STAGE_MERCHANT_ID,"MerchantTradeNo":t.merchant_trade_no,
        "MerchantTradeDate":t.created_at.astimezone(ZoneInfo("Asia/Taipei")).strftime("%Y/%m/%d %H:%M:%S"),
        "PaymentType":"aio","TotalAmount":str(t.amount),"TradeDesc":"WK ATM sandbox test",
        "ItemName":"WK ATM sandbox test","ReturnURL":origin+"/api/v1/payments/sandbox/ecpay/notify",
        "PaymentInfoURL":origin+"/api/v1/payments/sandbox/ecpay/info",
        "ClientBackURL":origin+"/admin", "ChoosePayment":"ATM","EncryptType":"1","ExpireDate":str(t.expire_days)}
    fields["CheckMacValue"] = check_mac(fields)
    return {"action":STAGE_CHECKOUT,"fields":fields}


def receive(db, fields, kind, source):
    if not valid_mac(fields):
        fail("INVALID_SIGNATURE", "通知驗證失敗",400)
    if fields.get("MerchantID") != STAGE_MERCHANT_ID or not fields.get("PaymentType", "").startswith("ATM_"):
        fail("PAYMENT_MISMATCH", "通知商店或付款方式不符",400)
    link = db.scalar(select(AtmSandboxTransaction.order_id).where(AtmSandboxTransaction.merchant_trade_no==fields.get("MerchantTradeNo", "")))
    if link:
        from app.core.locks import order_lock
        order_lock(db,link)
    t = db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.merchant_trade_no==fields.get("MerchantTradeNo", "")).with_for_update())
    if not t or t.source != source:
        fail("NOT_FOUND", "找不到對應測試交易",404)
    if fields.get("TradeAmt") != str(t.amount):
        fail("PAYMENT_MISMATCH", "通知金額不符",400)
    trade_no = fields.get("TradeNo", "")
    if not re.fullmatch(r"[A-Za-z0-9]{1,30}",trade_no) or (t.provider_trade_no and t.provider_trade_no != trade_no):
        fail("PAYMENT_MISMATCH", "交易編號不符",400)
    code = fields.get("RtnCode")
    if kind == "info" and code == "2":
        bank, account, expiry = fields.get("BankCode",""), fields.get("vAccount",""),fields.get("ExpireDate","")
        if not re.fullmatch(r"[0-9]{3}", bank) or not re.fullmatch(r"[0-9]{1,16}",account):
            fail("VALIDATION_ERROR", "取號資料不完整",400)
        from datetime import datetime
        try:
            datetime.strptime(expiry,"%Y/%m/%d")
        except ValueError:
            fail("VALIDATION_ERROR", "繳費期限格式不符",400)
        if t.virtual_account and (t.bank_code,t.virtual_account,t.expires_on) != (bank,account,expiry):
            fail("PAYMENT_MISMATCH", "重複取號資料不一致",400)
        t.bank_code,t.virtual_account,t.expires_on = bank,account,expiry
        if t.status != "paid":
            t.status = "awaiting_payment"
    elif kind == "notify" and code == "1":
        t.status = "paid"
        if not t.paid_at:
            payment_date=fields.get("PaymentDate", "")
            if payment_date:
                from datetime import datetime
                try:
                    t.paid_at=datetime.strptime(payment_date,"%Y/%m/%d %H:%M:%S").replace(tzinfo=ZoneInfo("Asia/Taipei"))
                except ValueError:
                    fail("VALIDATION_ERROR","付款時間格式不符",400)
            else:
                t.paid_at = now()
    elif code not in {"1", "2"}:
        # Late failures must never reverse a successful payment.
        if t.status == "created":
            t.status = "failed"
    else:
        fail("VALIDATION_ERROR", "通知種類不符",400)
    t.provider_trade_no = trade_no
    db.flush()
    if t.order_id:
        from .order_atm import sync_order
        sync_order(db,t,fields,kind)
    return t


def simulate(db,t,event):
    if t.source != "local":
        fail("INVALID_TRANSITION", "綠界測試交易不能以本機模擬更新",409)
    if event == "paid" and t.status not in {"awaiting_payment","paid"}:
        fail("INVALID_TRANSITION", "請先模擬取得帳號",409)
    fields={"MerchantID":STAGE_MERCHANT_ID,"MerchantTradeNo":t.merchant_trade_no,"TradeAmt":str(t.amount),"PaymentType":"ATM_TAISHIN","TradeNo":"LOCAL"+t.id.replace("-", "")[:20],"RtnCode":"2" if event=="info" else "1"}
    kind = "info" if event=="info" else "notify"
    if event == "info":
        fields.update(BankCode="000",vAccount="0000000000000000",ExpireDate=(now().astimezone(ZoneInfo("Asia/Taipei"))+timedelta(days=t.expire_days)).strftime("%Y/%m/%d"))
    fields["CheckMacValue"] = check_mac(fields)
    return receive(db, fields, kind, "local")
