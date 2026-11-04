from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.auth.models import Member,Session
from app.modules.catalog.models import Product
assert settings().app_env=="local"
with SessionLocal() as db:
    p=db.scalar(select(Product).where(Product.id=="9a75d748-d203-430f-bf37-78d7dffe8827"))
    assert p and p.title.startswith("ATM ")
    p.status="archived"
    m=db.scalar(select(Member).where(Member.login_email=="atm-qa@example.invalid"))
    assert m
    m.status="disabled"
    for s in db.scalars(select(Session).where(Session.principal_id==m.id)):
        s.revoked=True
    db.commit()
    print("QA product archived; QA member disabled; test orders retained.")
