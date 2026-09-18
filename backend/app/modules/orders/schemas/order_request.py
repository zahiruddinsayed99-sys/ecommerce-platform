from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from app.modules.orders.models.order import OrderStatus


class OrderItemRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(..., description="Quantity of items to purchase")

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]
    shipping_address: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Delivery address for the order",
    )

    @field_validator("shipping_address")
    @classmethod
    def validate_shipping_address(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Shipping address must not be blank")
        return stripped


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus


class ConfirmPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
