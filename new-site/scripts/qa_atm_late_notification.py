"""Inject a signed synthetic STAGE notification for the dedicated QA order only."""
import httpx
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import now
from app.integrations.ecpay import STAGE_MERCHANT_ID,check_mac
from app.modules.payments.models import AtmSandboxTransaction
from app.modules.orders.models import Order
from app.modules.auth.models import Member
from zoneinfo import ZoneInfo
assert settings().app_env=="local"
with SessionLocal() as db:
    t=db.scalar(select(AtmSandboxTransaction).where(AtmSandboxTransaction.merchant_trade_no=="WKOA5BD948C8C2566CD"))
    o=db.get(Order,t.order_id)
    m=db.get(Member,o.member_id)
    assert o.is_test and o.status=="cancelled" and m.login_email=="atm-qa@example.invalid"
    f=dict(MerchantID=STAGE_MERCHANT_ID,MerchantTradeNo=t.merchant_trade_no,TradeNo=t.provider_trade_no,TradeAmt=str(t.amount),PaymentType="ATM_CHINATRUST",RtnCode="1",RtnMsg="QA synthetic late-payment notification",SimulatePaid="1",PaymentDate=now().astimezone(ZoneInfo("Asia/Taipei")).strftime("%Y/%m/%d %H:%M:%S"))
    f["CheckMacValue"]=check_mac(f)
    r=httpx.post("http://localhost:8000/api/v1/payments/sandbox/ecpay/notify",data=f)
    print("Synthetic QA callback",r.status_code,r.text)
