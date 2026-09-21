import json

from app.core.cache import redis_client

from app.modules.catalog.models.product import Product
from app.modules.catalog.models.inventory import Inventory

from app.modules.catalog.repositories.product_repository import ProductRepository

from app.modules.catalog.repositories.inventory_repository import InventoryRepository


class ProductService:

    CACHE_KEY = "all_products"

    def __init__(
        self, product_repo: ProductRepository, inventory_repo: InventoryRepository
    ):
        self.product_repo = product_repo
        self.inventory_repo = inventory_repo

    def create_product(self, db, payload):

        product = Product(
            name=payload.name,
            description=payload.description,
            category_id=payload.category_id,
            price=payload.price,
            sku=payload.sku,
            image_url=payload.image_url,
        )

        self.product_repo.create(db, product)

        inventory = Inventory(
            product_id=product.id, stock_quantity=payload.stock_quantity
        )

        self.inventory_repo.create(db, inventory)

        db.commit()
        db.refresh(product)

        try:
            if redis_client:
                redis_client.delete(self.CACHE_KEY)
        except Exception as e:
            print(f"Redis cache delete warning: {e}")

        return product

    def get_products(
        self,
        db,
        category=None,
        min_price=None,
        max_price=None,
        search=None,
        page=1,
        size=20,
    ):

        cached = None
        try:
            if redis_client:
                cached = redis_client.get(self.CACHE_KEY)
        except Exception as e:
            print(f"Redis cache get warning: {e}")

        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        products = self.product_repo.get_products(
            db=db,
            category=category,
            min_price=min_price,
            max_price=max_price,
            search=search,
            page=page,
            size=size,
        )
        serialized = [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "description": p.description,
                    "category": p.category.name if p.category else None,
                    "category_id": str(p.category_id),
                    "price": float(p.price),
                    "stock_quantity": p.inventory.stock_quantity if p.inventory else 0,
                    "status": (
                        "Out of Stock"
                        if not p.inventory or p.inventory.stock_quantity == 0
                        else "Low Stock" if p.inventory.stock_quantity < 10 else "In Stock"
                    ),
                    "sku": p.sku,
                    "image_url": p.image_url,
                }
                for p in products
            ]

        try:
            if redis_client:
                redis_client.set(self.CACHE_KEY, json.dumps(serialized), ex=300)
        except Exception as e:
            print(f"Redis cache set warning: {e}")

        return serialized

    def get_product(self, db, product_id):
        product = self.product_repo.get_by_id(db, product_id)

        if not product:
            return None

        stock = product.inventory.stock_quantity if product.inventory else 0

        status = (
            "Out of Stock" if stock == 0 else "Low Stock" if stock < 10 else "In Stock"
        )

        return {
            "id": str(product.id),
            "name": product.name,
            "description": product.description,
            "category": product.category.name if product.category else None,
            "category_id": str(product.category_id),
            "price": float(product.price),
            "stock_quantity": stock,
            "status": status,
            "sku": product.sku,
            "image_url": product.image_url,
        }

    def get_product_entity(self, db, product_id):
        return self.product_repo.get_by_id(db, product_id)

    def update_product(self, db, product, payload):

        if payload.name:
            product.name = payload.name

        if payload.description:
            product.description = payload.description

        if payload.category_id:
            product.category_id = payload.category_id

        if payload.price:
            product.price = payload.price

        if payload.sku is not None:
            product.sku = payload.sku

        if payload.image_url is not None:
            product.image_url = payload.image_url

        if payload.stock_quantity is not None and product.inventory:
            product.inventory.stock_quantity = payload.stock_quantity

        self.product_repo.update(db, product)

        db.commit()

        db.refresh(product)

        try:
            if redis_client:
                redis_client.delete(self.CACHE_KEY)
        except Exception as e:
            print(f"Redis cache delete warning: {e}")

        return product

    def delete_product(self, db, product):

        self.product_repo.soft_delete(db, product)

        db.commit()

        try:
            if redis_client:
                redis_client.delete(self.CACHE_KEY)
        except Exception as e:
            print(f"Redis cache delete warning: {e}")