import pytest
from fastapi import HTTPException, status
from unittest.mock import MagicMock
from app.modules.orders.services.inventory_service import InventoryService
from app.modules.orders.schemas.order_request import OrderItemRequest
import uuid

class MockInventory:
    def __init__(self, stock_quantity):
        self.stock_quantity = stock_quantity

def test_validate_and_deduct_stock_success():
    mock_repo = MagicMock()
    mock_inventory = MockInventory(10)
    mock_repo.get_inventory_for_update.return_value = mock_inventory

    service = InventoryService(inventory_repo=mock_repo)
    product_id = str(uuid.uuid4())
    item = OrderItemRequest(product_id=product_id, quantity=5)

    service.validate_and_deduct_stock([item])

    assert mock_inventory.stock_quantity == 5
    mock_repo.get_inventory_for_update.assert_called_once_with(uuid.UUID(product_id))

def test_validate_and_deduct_stock_not_found():
    mock_repo = MagicMock()
    mock_repo.get_inventory_for_update.return_value = None

    service = InventoryService(inventory_repo=mock_repo)
    product_id = str(uuid.uuid4())
    item = OrderItemRequest(product_id=product_id, quantity=5)

    with pytest.raises(HTTPException) as exc_info:
        service.validate_and_deduct_stock([item])

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "does not exist in inventory" in exc_info.value.detail

def test_validate_and_deduct_stock_insufficient_stock():
    mock_repo = MagicMock()
    mock_inventory = MockInventory(3)
    mock_repo.get_inventory_for_update.return_value = mock_inventory

    service = InventoryService(inventory_repo=mock_repo)
    product_id = str(uuid.uuid4())
    item = OrderItemRequest(product_id=product_id, quantity=5)

    with pytest.raises(HTTPException) as exc_info:
        service.validate_and_deduct_stock([item])

    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Insufficient stock" in exc_info.value.detail
