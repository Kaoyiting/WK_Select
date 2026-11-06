from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class CustomerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(default="", max_length=30)
    email: str = Field(default="", max_length=254)
    notes: str = Field(default="", max_length=5000)
    expected_version: int | None = None


class MemberStatusInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["active", "disabled"]
