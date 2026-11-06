from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.modules.auth.models import uid


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    customer_id: Mapped[str | None] = mapped_column(ForeignKey("customers.id"))
    contact: Mapped[str] = mapped_column(String(500), default="")
    requested_name: Mapped[str] = mapped_column(String(240))
    product_url: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(120), default="")
    size: Mapped[str] = mapped_column(String(80), default="")
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(80), default="LINE")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"))
    order_id: Mapped[str | None] = mapped_column(ForeignKey("orders.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
