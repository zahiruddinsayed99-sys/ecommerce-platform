from app.modules.catalog.models.product import Product
from app.core.logger import logger
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, db, product: Product):
        db.add(product)
        db.flush()
        db.refresh(product)
        return product

    def get_by_id(self, db, product_id):
        logger.info(f"Fetching product with ID: {product_id}")
        return (
            db.query(Product)
            .options(joinedload(Product.inventory))
            .filter(Product.id == product_id, Product.is_active.is_(True))
            .first()
        )

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

        query = db.query(Product).options(joinedload(Product.inventory))

        query = query.filter(Product.is_active.is_(True))

        if category:
                query = query.filter(Product.category_id == category)

        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))

        if min_price is not None:
            query = query.filter(Product.price >= min_price)

        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        offset = (page - 1) * size

        return query.offset(offset).limit(size).all()

    def update(self, db, product):
        db.add(product)
        db.flush()
        db.refresh(product)
        return product

    def soft_delete(self, db, product):
        product.is_active = False

        db.add(product)

        return product
