from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ItemInput(Strict):
    variant_id: str
    quantity: int = Field(ge=1, le=1000)


class Receiver(Strict):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(pattern=r"^09\d{8}$")
    email: str = Field(default="", max_length=254)


class Store(Strict):
    id: str = Field(pattern=r"^\d{4,8}$")
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=1, max_length=300)


class OrderInput(Strict):
    items: list[ItemInput] = Field(min_length=1, max_length=100)
    receiver: Receiver
    store: Store
    shipping_method: Literal["711_cod", "711_prepaid"]
    payment_method: Literal["711_cod", "bank_transfer", "ecpay_atm_test"]
    expected_total_amount: int = Field(ge=1)
    note: str = Field(default="", max_length=1000)


class Transition(Strict):
    to_status: Literal["confirmed", "cancelled", "completed"]
    expected_version: int
    reason: str = Field(default="", max_length=500)


class ShipmentInput(Strict):
    tracking_number: str = Field(min_length=1, max_length=100)
    all_items_ready_confirmed: Literal[True]
    expected_version: int
