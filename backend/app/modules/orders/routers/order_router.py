from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database.session import get_db  # standard pattern dependency
from app.modules.auth.dependencies import (
    require_customer,
)
from app.modules.orders.schemas.order_request import CreateOrderRequest, ConfirmPaymentRequest
from app.modules.orders.schemas.order_response import OrderResponse, OrderDetailResponse, CheckoutSessionResponse
from app.modules.orders.services.order_service import OrderService
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.services.inventory_service import InventoryService
from app.modules.orders.repositories.inventory_transaction_repository import (
    InventoryTransactionRepository,
)
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.core.logger import logger

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


def get_order_service(db: Session = Depends(get_db)) -> OrderService:
    order_repo = OrderRepository(db)
    inv_repo = InventoryTransactionRepository(db)
    inv_service = InventoryService(inv_repo)
    prod_repo = ProductRepository(db)
    return OrderService(db, order_repo, inv_service, prod_repo)


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Order",
    description="Processes user cart items, deducts active inventory records with row locking protection, and issues an order record.",
)
def create_user_order(
    request: CreateOrderRequest,
    current_user=Depends(require_customer),
    service: OrderService = Depends(get_order_service),
):
    logger.info(f"Creating order for user: {current_user.id} with request: {request}")
    return service.create_order(user_id=current_user.id, request=request)


@router.get(
    "",
    response_model=list[OrderResponse],
    summary="Get Order History",
    description="Retrieves a list containing the order histories associated with the currently authenticated user session.",
)
def get_user_orders(
    current_user=Depends(require_customer),
    service: OrderService = Depends(get_order_service),
):
    return service.get_order_history(user_id=current_user.id)


@router.get(
    "/{order_id}",
    response_model=OrderDetailResponse,
    summary="Get Order Details",
    description="Fetches comprehensive profile details and breakdown item listings for a target order, provided user access ownership checks out.",
)
def get_user_order_by_id(
    order_id: UUID,
    current_user=Depends(require_customer),
    service: OrderService = Depends(get_order_service),
):
    return service.get_order_details(order_id=order_id, current_user_id=current_user.id)


@router.post(
    "/{order_id}/checkout-session",
    response_model=CheckoutSessionResponse,
    summary="Create Checkout Session",
    description="Generates a sandbox payment checkout token for a pending order.",
)
def create_checkout_session(
    order_id: UUID,
    current_user=Depends(require_customer),
    service: OrderService = Depends(get_order_service),
):
    token = service.create_checkout_session(order_id=order_id, current_user_id=current_user.id)
    return {"token": token}


@router.post(
    "/{order_id}/confirm-payment",
    response_model=OrderResponse,
    summary="Confirm Payment",
    description="Confirms payment and updates order status to PROCESSING.",
)
def confirm_payment(
    order_id: UUID,
    request: ConfirmPaymentRequest,
    current_user=Depends(require_customer),
    service: OrderService = Depends(get_order_service),
):
    return service.confirm_payment(order_id=order_id, current_user_id=current_user.id, payload=request)
