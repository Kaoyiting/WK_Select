from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class PaymentAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: int = Field(gt=0, le=100000000)
    reference: str = Field(min_length=1, max_length=500)
    expected_version: int


class AtmSandboxInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: int = Field(default=100, ge=16, le=49999)
    expire_days: int = Field(default=1, ge=1, le=60)


class AtmSandboxEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event: Literal["info", "paid"]
