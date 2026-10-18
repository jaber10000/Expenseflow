from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import SUPPORTED_CURRENCIES

TransactionKind = Literal["income", "expense"]


class TransactionBase(BaseModel):
    # forbid: a client sending user_id (or any unknown field) gets a 422 instead of being silently ignored.
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=120)
    category: str = Field(default="Other", max_length=60)
    transaction_type: TransactionKind
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    currency: str = Field(default="BDT", min_length=3, max_length=3)
    transaction_date: date
    payment_method: str = Field(default="Other", max_length=40)
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        value = value.upper()
        if value not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency. Choose one of: {', '.join(SUPPORTED_CURRENCIES)}")
        return value


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    # from_attributes lets us read ORM rows; extra="forbid" is for input only and harmless here.
    model_config = ConfigDict(from_attributes=True)
    id: int
