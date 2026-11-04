from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class RequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: str | None = None
    contact: str = Field(default="", max_length=500)
    requested_name: str = Field(min_length=1, max_length=240)
    product_url: str = Field(default="", max_length=2000)
    color: str = Field(default="", max_length=120)
    size: str = Field(default="", max_length=80)
    quantity: int = Field(default=1, ge=1, le=10000)
    source: str = Field(default="LINE", max_length=80)
    notes: str = Field(default="", max_length=10000)
    status: Literal["pending", "purchasing", "arrived", "unavailable", "closed"] = (
        "pending"
    )
    product_id: str | None = None
    order_id: str | None = None
    expected_version: int | None = None
