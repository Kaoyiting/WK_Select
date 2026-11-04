from pydantic import BaseModel, ConfigDict, Field


class ContentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: dict
    expected_version: int = Field(ge=1)
