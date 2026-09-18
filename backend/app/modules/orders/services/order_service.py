from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.modules.orders.models.order import Order, OrderStatus
from app.modules.orders.models.order_item import OrderItem
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.services.inventory_service import InventoryService
from app.modules.orders.schemas.order_request import CreateOrderRequest
from app.modules.catalog.repositories.product_repository import (
    ProductRepository,
)  # Presumed
from app.core.logger import logger
from decimal import Decimal
from datetime import datetime
import random

from app.modules.orders.models.order import (
    PaymentMethod,
    PaymentStatus,
    Currency,
)
from datetime import UTC
import uuid
import razorpay

from app.core.config import settings
from app.modules.orders.schemas.order_request import ConfirmPaymentRequest

class OrderService:
    def __init__(
        self,
        db: Session,
        order_repo: OrderRepository,
        inventory_service: InventoryService,
        product_repo: ProductRepository,
    ):
        self.db = db
        self.order_repo = order_repo
        self.inventory_service = inventory_service
        self.product_repo = product_repo

    def get_order_history(self, user_id: UUID) -> list[Order]:
        return self.order_repo.get_orders_by_user(user_id)

    def get_order_details(self, order_id: UUID, current_user_id: UUID) -> Order:
        order = self.order_repo.get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to view this order"
            )
        return order

    def get_all_orders(self) -> list[Order]:
        return self.order_repo.get_all_orders()

    def update_order_status(self, order_id: UUID, new_status: OrderStatus) -> Order:
        order = self.order_repo.get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Finite State Machine Transitions Validation
        valid_transitions = {
            OrderStatus.PENDING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.PROCESSING],
            OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
            OrderStatus.SHIPPED: [OrderStatus.DELIVERED],
            OrderStatus.DELIVERED: [],
            OrderStatus.CANCELLED: [],
        }

        if new_status not in valid_transitions[order.status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Status Transition from {order.status} to {new_status}",
            )

        updated_order = self.order_repo.update_status(order, new_status)
        self.db.commit()
        return updated_order

    def generate_order_number(self) -> str:
        """
        Temporary implementation.
        Later we can replace this with a sequence/table.
        """
        return f"ORD-{datetime.now(UTC):%Y%m%d}-" f"{random.randint(100000,999999)}"

    def create_checkout_session(self, order_id: UUID, current_user_id: UUID) -> str:
        order = self.order_repo.get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to checkout this order"
            )
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=400, detail="Only PENDING orders can be checked out"
            )

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        try:
            razorpay_order = client.order.create({
                "amount": int(order.total_amount * 100),
                "currency": "INR",
                "receipt": str(order_id)
            })
            return razorpay_order["id"]
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Payment gateway error")

    def confirm_payment(self, order_id: UUID, current_user_id: UUID, payload: ConfirmPaymentRequest) -> Order:
        order = self.order_repo.get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.user_id != current_user_id:
            raise HTTPException(
                status_code=403, detail="Not authorized to confirm this order"
            )
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=400, detail="Only PENDING orders can be confirmed"
            )

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature
            })
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid payment signature")

        # Atomically transition order status from Pending to Processing
        order.payment_status = PaymentStatus.PAID
        order.payment_date = datetime.now(UTC)
        order.payment_reference = payload.razorpay_payment_id
        updated_order = self.update_order_status(order_id, OrderStatus.PROCESSING)
        return updated_order

    def create_order(
        self,
        user_id: UUID,
        request: CreateOrderRequest,
    ) -> Order:
        try:
            logger.info(
                "Starting order creation for user %s",
                user_id,
            )

            # Validate inventory (row locking happens inside InventoryService)
            self.inventory_service.validate_and_deduct_stock(request.items)

            new_order = Order(
                order_number=self.generate_order_number(),
                user_id=user_id,
                status=OrderStatus.PENDING,
                shipping_address=request.shipping_address,
                payment_method=PaymentMethod.COD,
                payment_status=PaymentStatus.PENDING,
                currency=Currency.INR,
                total_amount=Decimal("0.00"),
            )

            total_amount: Decimal = Decimal("0.00")

            for item in request.items:

                product = self.product_repo.get_by_id(
                    self.db,
                    item.product_id,
                )

                if product is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid product.",
                    )

                subtotal = Decimal(product.price) * item.quantity

                order_item = OrderItem(
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.price,
                    subtotal=subtotal,
                    product_name=product.name,
                    product_sku=product.sku or "",
                )

                new_order.items.append(order_item)
                total_amount += subtotal
            new_order.total_amount = Decimal(total_amount)

            saved_order = self.order_repo.create_order(new_order)

            self.db.commit()
            self.db.refresh(saved_order)

            return saved_order

        except HTTPException:
            self.db.rollback()
            raise

        except Exception as ex:
            self.db.rollback()

            logger.exception("Order creation failed")

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Transaction Failed: {str(ex)}",
            )
