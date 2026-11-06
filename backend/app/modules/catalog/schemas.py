from typing import Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class VariantInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str | None = None
    color: str = Field(default="", max_length=120)
    size: str = Field(default="", max_length=80)
    stock_qty: int | None = Field(default=None, ge=0, le=1000000)
    enabled: bool = True


class ProductInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=240)
    brand: str = Field(default="", max_length=120)
    category: str = Field(default="", max_length=120)
    country: Literal["korea", "japan", "other"] = "korea"
    kind: Literal["stock", "preorder"] = "preorder"
    status: Literal["draft", "published", "offline", "archived"] = "draft"
    badge: str = Field(default="", max_length=80)
    price_amount: int | None = Field(default=None, ge=1, le=10000000)
    sale_amount: int | None = Field(default=None, ge=1, le=10000000)
    sale_starts_at: datetime | None = None
    sale_ends_at: datetime | None = None
    gallery: list[str] = Field(default_factory=list, max_length=40)
    image_colors: dict[str, str] = Field(default_factory=dict, max_length=40)
    description_html: str = Field(default="", max_length=100000)
    size_guide_html: str = Field(default="", max_length=30000)
    variants: list[VariantInput] = Field(min_length=1, max_length=200)
    expected_version: int | None = None

    @model_validator(mode="after")
    def validate_prices_stock(self):
        for dt in [self.sale_starts_at, self.sale_ends_at]:
            if dt and dt.tzinfo is None:
                raise ValueError("特價時間必須包含時區")
        if (self.sale_starts_at or self.sale_ends_at) and self.sale_amount is None:
            raise ValueError("設定特價時段前請填特價")
        if self.sale_starts_at and self.sale_ends_at and self.sale_starts_at >= self.sale_ends_at:
            raise ValueError("特價結束時間必須晚於開始時間")
        if self.status == "published" and not self.gallery:
            raise ValueError("上架商品至少需要一張圖片")
        colors = {v.color for v in self.variants}
        if any(url not in self.gallery or color not in colors for url, color in self.image_colors.items()):
            raise ValueError("圖片顏色必須對應有效的照片與規格")
        if self.sale_amount is not None and (
            self.price_amount is None or self.sale_amount >= self.price_amount
        ):
            raise ValueError("特價必須低於原價")
        pairs = [(v.color, v.size) for v in self.variants]
        if len(set(pairs)) != len(pairs):
            raise ValueError("顏色尺寸組合重複")
        for v in self.variants:
            if self.kind == "stock" and v.stock_qty is None:
                raise ValueError("現貨必須填寫每個規格的庫存")
            if self.kind == "preorder" and v.stock_qty is not None:
                raise ValueError("預購不填寫庫存")
        return self


class NavigationInput(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def ignore_legacy_readonly_fields(cls, data):
        # Older admin tabs included response-only fields. The route ID and
        # expected_version remain authoritative; never mass-assign these values.
        if isinstance(data, dict):
            return {k: v for k, v in data.items() if k not in {"id", "version"}}
        return data

    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=160)
    action: Literal[
        "all",
        "category",
        "brand",
        "new",
        "live",
        "stock",
        "korea",
        "japan",
        "sale",
        "custom",
    ]
    action_value: str = Field(default="", max_length=500)
    parent_id: str | None = None
    placement: Literal["both", "header", "sidebar"] = "both"
    sort_order: int = 0
    enabled: bool = True
    expected_version: int | None = None


class EntryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=160)
