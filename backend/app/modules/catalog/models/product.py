import uuid

from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from app.database.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[str] = mapped_column(Text, nullable=True)

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )

    sku: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )

    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at = mapped_column(DateTime(timezone=True), server_default=func.now())

    updated_at = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category = relationship("Category", backref="products")
    inventory = relationship("Inventory", back_populates="product", uselist=False)