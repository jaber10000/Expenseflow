from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.constants import DEFAULT_BASE_CURRENCY, SUPPORTED_CURRENCIES


def _normalize_currency(value: str) -> str:
    value = value.strip().upper()
    if value not in SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency. Choose one of: {', '.join(SUPPORTED_CURRENCIES)}")
    return value


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    base_currency: str = DEFAULT_BASE_CURRENCY

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v

    @field_validator("base_currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        return _normalize_currency(v)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.strip().lower()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    base_currency: str
