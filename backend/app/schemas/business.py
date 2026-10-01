from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BusinessBase(BaseModel):
    enterprise_name: str = Field(
        ...,
        min_length=2,
        max_length=255,
        description="Name of the enterprise or business venture",
        examples=["Namo Agro Tech Ltd."],
    )
    business_type: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Category/type of business industry",
        examples=["Food Processing Unit"],
    )
    state: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="State of operation in India",
        examples=["Maharashtra"],
    )
    investment_inr: float = Field(
        ...,
        gt=0,
        description="Planned total capital investment in INR",
        examples=[5000000.0],
    )
    employee_count: int = Field(
        ...,
        ge=1,
        description="Anticipated number of employees",
        examples=[25],
    )


class BusinessCreate(BusinessBase):
    pass


class BusinessResponse(BusinessBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
