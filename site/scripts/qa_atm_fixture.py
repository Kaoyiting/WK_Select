"""Local-only disposable QA fixtures; no real customer data."""
from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import password_hasher
from app.modules.auth.models import Member
from app.modules.customers.models import Customer
from app.modules.catalog.models import Product,Variant
assert settings().app_env=="local"
with SessionLocal() as db:
    m=db.scalar(select(Member).where(Member.login_email=="atm-qa@example.invalid"))
    if not m:
        m=Member(login_email="atm-qa@example.invalid",email="atm-qa@example.invalid",display_name="ATM 整合測試",password_hash=password_hasher.hash("Local-QA-Only-2026!"))
        db.add(m);db.flush()
        db.add(Customer(member_id=m.id,name="ATM 整合測試",phone="0900000000",email=m.email,preferred_store={"id":"999999","name":"測試門市（不寄送）","address":"僅供本機驗證，不寄送"}))
    p=db.scalar(select(Product).where(Product.title=="ATM 整合測試商品（不販售）"))
    if not p:
        sample=db.scalar(select(Product).where(Product.status=="published"))
        p=Product(title="ATM 整合測試商品（不販售）",kind="stock",status="published",price_amount=100,category="上衣",gallery=sample.gallery[:1] if sample else [])
        db.add(p);db.flush()
        db.add(Variant(product_id=p.id,color="測試色",size="M",stock_qty=2))
    db.commit()
    print("QA_PRODUCT_ID="+p.id)
