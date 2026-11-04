from sqlalchemy import BigInteger
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.modules.auth.models import uid


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True)
    status: Mapped[str] = mapped_column(String(30), default="unpaid")
    amount: Mapped[int] = mapped_column(BigInteger)
    refunded_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    reference: Mapped[str] = mapped_column(String(500), default="")
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1)


class AtmSandboxTransaction(Base):
    """Only test data. Deliberately has no order/payment foreign keys."""
    __tablename__ = "atm_sandbox_transactions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    admin_id: Mapped[str | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True)
    order_id: Mapped[str | None] = mapped_column(ForeignKey("orders.id"), nullable=True, unique=True)
    merchant_trade_no: Mapped[str] = mapped_column(String(20), unique=True)
    amount: Mapped[int] = mapped_column(BigInteger)
    expire_days: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="created")
    submitted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="local")
    provider_trade_no: Mapped[str] = mapped_column(String(30), default="")
    bank_code: Mapped[str] = mapped_column(String(3), default="")
    virtual_account: Mapped[str] = mapped_column(String(20), default="")
    expires_on: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
