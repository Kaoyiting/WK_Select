from sqlalchemy import create_engine, String
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Mapped, mapped_column

SHOP_ID = "00000000-0000-0000-0000-000000000001"
from app.core.config import settings


class Base(DeclarativeBase):
    # A migration marker only. This database serves exactly one shop; not SaaS isolation.
    tenant_id: Mapped[str] = mapped_column(String(36), default=SHOP_ID, server_default=SHOP_ID, index=True)


engine = create_engine(settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db
