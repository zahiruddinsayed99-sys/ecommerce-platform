"""add catalog master data support

Revision ID: d8a6f0b93c41
Revises: 9b2f4f6c7a81
Create Date: 2026-07-16 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d8a6f0b93c41"
down_revision: Union[str, Sequence[str], None] = "400c87388bd6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return column_name in {
        column["name"] for column in inspector.get_columns(table_name)
    }


def _has_index(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def _has_unique_constraint(
    inspector: sa.Inspector, table_name: str, constraint_name: str
) -> bool:
    return constraint_name in {
        constraint["name"]
        for constraint in inspector.get_unique_constraints(table_name)
    }


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Create products table first so foreign keys can reference it
    if not inspector.has_table("products"):
        op.create_table(
            "products",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # 2. Create orders table if missing (needed for later migrations)
    if not inspector.has_table("orders"):
        op.create_table(
            "orders",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.Column("status", sa.String(length=50), server_default="PENDING", nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # 3. Create order_items table if missing
    if not inspector.has_table("order_items"):
        op.create_table(
            "order_items",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
            sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # 4. Create inventory table (which references products.id safely now)
    if not inspector.has_table("inventory"):
        op.create_table(
            "inventory",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                "stock_quantity", sa.Integer(), nullable=False, server_default="0"
            ),
            sa.Column(
                "reserved_quantity", sa.Integer(), nullable=False, server_default="0"
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=True,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("product_id"),
        )

    if not inspector.has_table("categories"):
        op.create_table(
            "categories",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=True,
                server_default=sa.text("now()"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name", name="uq_categories_name"),
            sa.UniqueConstraint("slug", name="uq_categories_slug"),
        )

    refreshed_inspector = sa.inspect(bind)
    if refreshed_inspector.has_table("products"):
        if not _has_column(refreshed_inspector, "products", "sku"):
            op.add_column(
                "products",
                sa.Column("sku", sa.String(length=64), nullable=True),
            )
            op.execute("""
                UPDATE products
                SET sku = COALESCE(
                    sku,
                    'LEGACY-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12))
                )
                """)

        refreshed_inspector = sa.inspect(bind)
        if not _has_unique_constraint(
            refreshed_inspector, "products", "uq_products_sku"
        ):
            op.create_unique_constraint("uq_products_sku", "products", ["sku"])
        if not _has_index(refreshed_inspector, "products", "ix_products_sku"):
            op.create_index("ix_products_sku", "products", ["sku"])


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("inventory"):
        op.drop_table("inventory")

    if inspector.has_table("products"):
        if _has_index(inspector, "products", "ix_products_sku"):
            op.drop_index("ix_products_sku", table_name="products")
        if _has_unique_constraint(inspector, "products", "uq_products_sku"):
            op.drop_constraint("uq_products_sku", "products", type_="unique")

        product_columns = {
            column["name"] for column in inspector.get_columns("products")
        }
        if "sku" in product_columns:
            op.drop_column("products", "sku")

    refreshed_inspector = sa.inspect(bind)
    if refreshed_inspector.has_table("categories"):
        op.drop_table("categories")
