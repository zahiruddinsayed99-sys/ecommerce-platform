import pytest
from uuid import uuid4
from decimal import Decimal
from fastapi import HTTPException, status
from unittest.mock import MagicMock, patch
from app.modules.orders.services.order_service import OrderService
from app.modules.orders.models.order import Order, OrderStatus, PaymentStatus, Currency, PaymentMethod
from app.modules.orders.schemas.order_request import CreateOrderRequest, OrderItemRequest, ConfirmPaymentRequest
from datetime import datetime, UTC

def test_get_order_history():
    mock_order_repo = MagicMock()
    mock_order_repo.get_orders_by_user.return_value = ["order1", "order2"]

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    user_id = uuid4()
    result = service.get_order_history(user_id)

    assert result == ["order1", "order2"]
    mock_order_repo.get_orders_by_user.assert_called_once_with(user_id)

def test_get_order_details_success():
    mock_order_repo = MagicMock()
    user_id = uuid4()
    order_id = uuid4()
    order = Order(id=order_id, user_id=user_id)
    mock_order_repo.get_order_by_id.return_value = order

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    result = service.get_order_details(order_id, user_id)

    assert result == order
    mock_order_repo.get_order_by_id.assert_called_once_with(order_id)

def test_get_order_details_not_found():
    mock_order_repo = MagicMock()
    mock_order_repo.get_order_by_id.return_value = None

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        service.get_order_details(uuid4(), uuid4())

    assert exc_info.value.status_code == 404

def test_get_order_details_unauthorized():
    mock_order_repo = MagicMock()
    order = Order(id=uuid4(), user_id=uuid4())
    mock_order_repo.get_order_by_id.return_value = order

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        service.get_order_details(order.id, uuid4())

    assert exc_info.value.status_code == 403

def test_get_all_orders():
    mock_order_repo = MagicMock()
    mock_order_repo.get_all_orders.return_value = ["order1"]

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    assert service.get_all_orders() == ["order1"]

def test_update_order_status_success():
    mock_db = MagicMock()
    mock_order_repo = MagicMock()
    order = Order(id=uuid4(), status=OrderStatus.PENDING)
    mock_order_repo.get_order_by_id.return_value = order
    mock_order_repo.update_status.return_value = order

    service = OrderService(db=mock_db, order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    result = service.update_order_status(order.id, OrderStatus.PROCESSING)

    assert result == order
    mock_order_repo.update_status.assert_called_once_with(order, OrderStatus.PROCESSING)
    mock_db.commit.assert_called_once()

def test_update_order_status_invalid_transition():
    mock_order_repo = MagicMock()
    order = Order(id=uuid4(), status=OrderStatus.SHIPPED)
    mock_order_repo.get_order_by_id.return_value = order

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        service.update_order_status(order.id, OrderStatus.PENDING)

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST

@patch("app.modules.orders.services.order_service.razorpay.Client")
def test_create_checkout_session(mock_razorpay):
    mock_client_instance = MagicMock()
    mock_razorpay.return_value = mock_client_instance
    mock_client_instance.order.create.return_value = {"id": "razorpay_order_id_123"}

    mock_order_repo = MagicMock()
    user_id = uuid4()
    order_id = uuid4()
    order = Order(id=order_id, user_id=user_id, status=OrderStatus.PENDING, total_amount=Decimal("100.00"))
    mock_order_repo.get_order_by_id.return_value = order

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    result = service.create_checkout_session(order_id, user_id)

    assert result == "razorpay_order_id_123"
    mock_client_instance.order.create.assert_called_once_with({
        "amount": 10000,
        "currency": "INR",
        "receipt": str(order_id)
    })

@patch("app.modules.orders.services.order_service.razorpay.Client")
def test_confirm_payment_success(mock_razorpay):
    mock_client_instance = MagicMock()
    mock_razorpay.return_value = mock_client_instance
    mock_client_instance.utility.verify_payment_signature.return_value = None

    mock_order_repo = MagicMock()
    user_id = uuid4()
    order_id = uuid4()
    order = Order(id=order_id, user_id=user_id, status=OrderStatus.PENDING)
    mock_order_repo.get_order_by_id.return_value = order
    mock_order_repo.update_status.return_value = order

    service = OrderService(db=MagicMock(), order_repo=mock_order_repo, inventory_service=MagicMock(), product_repo=MagicMock())

    payload = ConfirmPaymentRequest(
        razorpay_order_id="order_123",
        razorpay_payment_id="pay_123",
        razorpay_signature="sig_123"
    )

    result = service.confirm_payment(order_id, user_id, payload)

    assert result.payment_status == PaymentStatus.PAID
    assert result.payment_reference == "pay_123"

def test_create_order_success():
    mock_db = MagicMock()
    mock_order_repo = MagicMock()
    mock_inventory_service = MagicMock()
    mock_product_repo = MagicMock()

    user_id = uuid4()
    product_id_str = str(uuid4())
    product_id = uuid4()

    product_mock = MagicMock()
    product_mock.id = product_id
    product_mock.price = Decimal("50.00")
    product_mock.name = "Test Product"
    product_mock.sku = "SKU123"

    mock_product_repo.get_by_id.return_value = product_mock

    def create_order_side_effect(order):
        order.id = uuid4()
        return order

    mock_order_repo.create_order.side_effect = create_order_side_effect

    service = OrderService(db=mock_db, order_repo=mock_order_repo, inventory_service=mock_inventory_service, product_repo=mock_product_repo)

    request = CreateOrderRequest(
        shipping_address="123 Main St",
        items=[OrderItemRequest(product_id=product_id_str, quantity=2)]
    )

    result = service.create_order(user_id, request)

    assert result.total_amount == Decimal("100.00")
    assert len(result.items) == 1
    assert result.items[0].subtotal == Decimal("100.00")

    mock_inventory_service.validate_and_deduct_stock.assert_called_once_with(request.items)
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(result)

def test_create_order_invalid_product():
    mock_db = MagicMock()
    mock_order_repo = MagicMock()
    mock_inventory_service = MagicMock()
    mock_product_repo = MagicMock()

    user_id = uuid4()
    product_id_str = str(uuid4())

    mock_product_repo.get_by_id.return_value = None

    service = OrderService(db=mock_db, order_repo=mock_order_repo, inventory_service=mock_inventory_service, product_repo=mock_product_repo)

    request = CreateOrderRequest(
        shipping_address="123 Main St",
        items=[OrderItemRequest(product_id=product_id_str, quantity=2)]
    )

    with pytest.raises(HTTPException) as exc_info:
        service.create_order(user_id, request)

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid product" in exc_info.value.detail
    mock_db.rollback.assert_called_once()
