import pytest
from unittest.mock import MagicMock
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.models.product import Product

def test_create_product():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    product = Product(name="Test Product", price=10.0, is_active=True)

    result = repo.create(mock_db, product)

    mock_db.add.assert_called_once_with(product)
    mock_db.flush.assert_called_once()
    mock_db.refresh.assert_called_once_with(product)
    assert result == product

def test_get_by_id():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    mock_query = mock_db.query.return_value
    mock_options = mock_query.options.return_value
    mock_filter = mock_options.filter.return_value

    expected_product = Product(id=1, name="Test Product")
    mock_filter.first.return_value = expected_product

    result = repo.get_by_id(mock_db, 1)

    assert result == expected_product

def test_get_products_with_filters():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    mock_query = mock_db.query.return_value
    mock_options = mock_query.options.return_value

    # Simulate filter chain
    mock_options.filter.return_value = mock_options

    mock_offset = mock_options.offset.return_value
    mock_limit = mock_offset.limit.return_value

    expected_products = [Product(id=1, name="P1"), Product(id=2, name="P2")]
    mock_limit.all.return_value = expected_products

    result = repo.get_products(mock_db, category="cat1", min_price=10.0, max_price=50.0, search="test", page=2, size=10)

    assert result == expected_products
    mock_options.offset.assert_called_once_with(10)
    mock_offset.limit.assert_called_once_with(10)

def test_get_products_no_filters():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    mock_query = mock_db.query.return_value
    mock_options = mock_query.options.return_value
    mock_options.filter.return_value = mock_options

    mock_offset = mock_options.offset.return_value
    mock_limit = mock_offset.limit.return_value

    expected_products = [Product(id=1, name="P1")]
    mock_limit.all.return_value = expected_products

    result = repo.get_products(mock_db, page=1, size=20)

    assert result == expected_products
    mock_options.offset.assert_called_once_with(0)
    mock_offset.limit.assert_called_once_with(20)

def test_update_product():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    product = Product(id=1, name="Updated Product")
    result = repo.update(mock_db, product)

    mock_db.add.assert_called_once_with(product)
    mock_db.flush.assert_called_once()
    mock_db.refresh.assert_called_once_with(product)
    assert result == product

def test_soft_delete_product():
    mock_db = MagicMock()
    repo = ProductRepository(db=mock_db)

    product = Product(id=1, name="Test Product", is_active=True)
    result = repo.soft_delete(mock_db, product)

    assert result.is_active is False
    mock_db.add.assert_called_once_with(product)
