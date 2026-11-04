from sqlalchemy import BigInteger
from sqlalchemy import (
    DateTime,
    String,
    Integer,
    Text,
    JSON,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.modules.auth.models import uid
from datetime import datetime
from zoneinfo import ZoneInfo


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    legacy_id: Mapped[int | None] = mapped_column(Integer, unique=True)
    title: Mapped[str] = mapped_column(String(240))
    brand: Mapped[str] = mapped_column(String(120), default="")
    category: Mapped[str] = mapped_column(String(120), default="")
    country: Mapped[str] = mapped_column(String(20), default="korea")
    kind: Mapped[str] = mapped_column(String(20), default="preorder")
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    badge: Mapped[str] = mapped_column(String(80), default="")
    price_amount: Mapped[int | None] = mapped_column(BigInteger)
    sale_amount: Mapped[int | None] = mapped_column(BigInteger)
    sale_starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sale_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    gallery: Mapped[list] = mapped_column(JSON, default=list)
    image_colors: Mapped[dict] = mapped_column(JSON, default=dict)
    description_html: Mapped[str] = mapped_column(Text, default="")
    size_guide_html: Mapped[str] = mapped_column(Text, default="")
    date: Mapped[int] = mapped_column(Integer, default=lambda: int(datetime.now(ZoneInfo("Asia/Taipei")).strftime("%Y%m%d")))
    version: Mapped[int] = mapped_column(Integer, default=1)
    variants: Mapped[list["Variant"]] = relationship(
        back_populates="product", order_by="Variant.color, Variant.size"
    )
    __table_args__ = (
        CheckConstraint("price_amount IS NULL OR price_amount >= 0"),
        CheckConstraint(
            "sale_amount IS NULL OR (price_amount IS NOT NULL AND sale_amount >= 0 AND sale_amount < price_amount)"
        ),
    )


class Variant(Base):
    __tablename__ = "product_variants"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    color: Mapped[str] = mapped_column(String(120), default="")
    size: Mapped[str] = mapped_column(String(80), default="")
    stock_qty: Mapped[int | None] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    product: Mapped[Product] = relationship(back_populates="variants")
    __table_args__ = (
        CheckConstraint("stock_qty IS NULL OR stock_qty >= 0"),
        UniqueConstraint("product_id", "color", "size"),
    )


class CatalogEntry(Base):
    __tablename__ = "catalog_entries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    kind: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(160))
    __table_args__ = (UniqueConstraint("kind", "name"),)


class Navigation(Base):
    __tablename__ = "navigation_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("navigation_items.id"))
    label: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(30))
    action_value: Mapped[str] = mapped_column(String(500), default="")
    placement: Mapped[str] = mapped_column(String(20), default="both")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)


class ProductView(Base):
    __tablename__ = "product_views"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    visitor_hash: Mapped[str] = mapped_column(String(64))
    window: Mapped[int] = mapped_column(BigInteger)
    __table_args__ = (UniqueConstraint("product_id", "visitor_hash", "window"),)
