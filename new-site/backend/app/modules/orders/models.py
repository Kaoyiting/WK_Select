from sqlalchemy import BigInteger
from datetime import datetime
from sqlalchemy import (
    Boolean,
    String,
    Integer,
    Text,
    JSON,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.security import now
from app.modules.auth.models import uid


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_number: Mapped[str] = mapped_column(String(40), unique=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("members.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    subtotal_amount: Mapped[int] = mapped_column(BigInteger)
    shipping_amount: Mapped[int] = mapped_column(BigInteger)
    total_amount: Mapped[int] = mapped_column(BigInteger)
    receiver: Mapped[dict] = mapped_column(JSON)
    store: Mapped[dict] = mapped_column(JSON)
    shipping_method: Mapped[str] = mapped_column(String(30))
    payment_method: Mapped[str] = mapped_column(String(30))
    note: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    is_test: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    payment_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    items: Mapped[list["OrderItem"]] = relationship()


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    variant_id: Mapped[str] = mapped_column(ForeignKey("product_variants.id"))
    image_url: Mapped[str] = mapped_column(Text, default="")
    title: Mapped[str] = mapped_column(String(240))
    color: Mapped[str] = mapped_column(String(120))
    size: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(20))
    unit_amount: Mapped[int] = mapped_column(BigInteger)
    quantity: Mapped[int] = mapped_column(Integer)


class Shipment(Base):
    __tablename__ = "shipments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), unique=True)
    tracking_number: Mapped[str] = mapped_column(String(100))
    confirmed_by: Mapped[str] = mapped_column(ForeignKey("admin_accounts.id"))
    shipped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Idempotency(Base):
    __tablename__ = "idempotency_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(String(36))
    operation: Mapped[str] = mapped_column(String(80))
    key: Mapped[str] = mapped_column(String(128))
    request_hash: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict | None] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("actor_id", "operation", "key"),)
