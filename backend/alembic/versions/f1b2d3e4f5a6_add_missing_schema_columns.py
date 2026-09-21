"""add missing schema columns

Revision ID: f1b2d3e4f5a6
Revises: c7d8e9f0a1b2
Create Date: 2026-08-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1b2d3e4f5a6'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- 1. Seed Roles ---
    op.execute("""
        INSERT INTO roles (id, name, description) 
        VALUES 
          (gen_random_uuid(), 'Admin', 'Administrator with full system access'),
          (gen_random_uuid(), 'Customer', 'Standard e-commerce customer account'),
          (gen_random_uuid(), 'Master', 'Super-user master role')
        ON CONFLICT (name) DO NOTHING;
    """)

    # --- 2. Seed Admin User ---
    op.execute("""
        INSERT INTO users (id, email, password_hash, role_id)
        VALUES (
            gen_random_uuid(),
            'admin@solvexa.com',
            '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', -- pre-hashed password for 'admin123'
            (SELECT id FROM roles WHERE name = 'Admin')
        )
        ON CONFLICT (email) DO NOTHING;
    """)

    # --- 3. Seed Categories ---
    op.execute("""
        INSERT INTO categories (id, name, slug, description) 
        VALUES 
          ('53756857-77f5-4ed1-bb49-9350b314345f', 'Electronics', 'electronics', 'Phones, cameras, wearables, and everyday gadgets.'),
          ('248d7afe-6d85-4221-a92a-8c192bc21e77', 'Computers', 'computers', 'Laptops, desktops, monitors, and PC peripherals.'),
          ('fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Footwear', 'footwear', 'Shoes and boots for sport, work, and everyday wear.'),
          ('145d64e6-f90b-4600-b2f3-136341b36dbb', 'Home', 'home', 'Small appliances, furniture, and household essentials.'),
          ('3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'Audio', 'audio', 'Speakers, headphones, and other listening gear.')
        ON CONFLICT (id) DO NOTHING;
    """)

    # --- 4. Seed All 30 Products ---
    op.execute("""
        INSERT INTO products (id, sku, name, category_id, description, price, is_active) 
        VALUES 
          -- Electronics
          (gen_random_uuid(), 'ELEC-001', 'Pulse 6 Smartphone', '53756857-77f5-4ed1-bb49-9350b314345f', '6.5-inch OLED smartphone with triple-lens camera, 128GB storage, and all-day battery life.', 699.99, true),
          (gen_random_uuid(), 'ELEC-002', 'AeroTab 11 Tablet', '53756857-77f5-4ed1-bb49-9350b314345f', '11-inch tablet with stylus support, ideal for note-taking, sketching, and media streaming.', 449.00, true),
          (gen_random_uuid(), 'ELEC-003', 'OrbitCam Security Camera', '53756857-77f5-4ed1-bb49-9350b314345f', '1080p Wi-Fi security camera with night vision, motion alerts, and two-way audio.', 59.99, true),
          (gen_random_uuid(), 'ELEC-004', 'FlexBand Fitness Tracker', '53756857-77f5-4ed1-bb49-9350b314345f', 'Lightweight fitness band tracking heart rate, sleep, and steps with a 10-day battery.', 39.50, true),
          (gen_random_uuid(), 'ELEC-005', 'VoltCharge 65W GaN Charger', '53756857-77f5-4ed1-bb49-9350b314345f', 'Compact 65W GaN fast charger with dual USB-C ports for phones and laptops.', 34.99, true),
          (gen_random_uuid(), 'ELEC-006', 'LumaStream 4K Streaming Stick', '53756857-77f5-4ed1-bb49-9350b314345f', '4K HDR streaming stick with voice remote and support for all major apps.', 49.99, true),

          -- Computers
          (gen_random_uuid(), 'COMP-001', 'Nimbus 14 Ultrabook', '248d7afe-6d85-4221-a92a-8c192bc21e77', '14-inch ultrabook with a 12-core CPU, 16GB RAM, and 512GB NVMe SSD.', 1199.00, true),
          (gen_random_uuid(), 'COMP-002', 'ForgeStation Desktop Tower', '248d7afe-6d85-4221-a92a-8c192bc21e77', 'Mid-tower desktop with discrete graphics, tuned for creative and dev workloads.', 1599.00, true),
          (gen_random_uuid(), 'COMP-003', 'ClearView 27\" 4K Monitor', '248d7afe-6d85-4221-a92a-8c192bc21e77', '27-inch 4K IPS monitor with 99% sRGB coverage and a slim-bezel design.', 379.99, true),
          (gen_random_uuid(), 'COMP-004', 'TypeCraft Mechanical Keyboard', '248d7afe-6d85-4221-a92a-8c192bc21e77', 'Hot-swappable mechanical keyboard with tactile switches and per-key RGB.', 119.00, true),
          (gen_random_uuid(), 'COMP-005', 'GlideMax Wireless Mouse', '248d7afe-6d85-4221-a92a-8c192bc21e77', 'Ergonomic wireless mouse with a 4000 DPI sensor and silent clicks.', 29.99, true),
          (gen_random_uuid(), 'COMP-006', 'DockPro 12-in-1 USB-C Hub', '248d7afe-6d85-4221-a92a-8c192bc21e77', '12-in-1 USB-C docking hub with HDMI, Ethernet, SD card, and 100W pass-through.', 64.99, true),
          (gen_random_uuid(), 'COMP-007', 'VaultDrive 2TB External SSD', '248d7afe-6d85-4221-a92a-8c192bc21e77', 'Pocket-sized 2TB external SSD with USB 3.2 speeds up to 1050MB/s.', 159.99, true),

          -- Footwear
          (gen_random_uuid(), 'SHOE-001', 'TrailBlaze Hiking Boots', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Waterproof hiking boots with reinforced ankle support and a grippy lug sole.', 129.99, true),
          (gen_random_uuid(), 'SHOE-002', 'SprintCore Running Shoes', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Lightweight running shoes with responsive foam cushioning for daily mileage.', 94.99, true),
          (gen_random_uuid(), 'SHOE-003', 'UrbanFlex Casual Sneakers', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Everyday sneakers with a knit upper and a cushioned, flexible sole.', 69.99, true),
          (gen_random_uuid(), 'SHOE-004', 'CourtSide Basketball Shoes', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'High-top basketball shoes with mid-cut support and impact-absorbing midsoles.', 114.99, true),
          (gen_random_uuid(), 'SHOE-005', 'RainGuard Ankle Boots', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Sealed-seam ankle boots built to keep feet dry in wet, cold weather.', 84.99, true),
          (gen_random_uuid(), 'SHOE-006', 'GlideWalk Slip-On Loafers', 'fff5208a-c7ab-4b80-aaab-1e2e1cad6a19', 'Slip-on loafers with a memory-foam footbed for all-day office comfort.', 59.99, true),

          -- Home
          (gen_random_uuid(), 'HOME-001', 'BrewMaster Drip Coffee Maker', '145d64e6-f90b-4600-b2f3-136341b36dbb', '12-cup programmable drip coffee maker with a reusable gold-tone filter.', 54.99, true),
          (gen_random_uuid(), 'HOME-002', 'AeroFlow Tower Fan', '145d64e6-f90b-4600-b2f3-136341b36dbb', 'Quiet oscillating tower fan with 3 speeds and a remote control.', 74.99, true),
          (gen_random_uuid(), 'HOME-003', 'PureAir HEPA Purifier', '145d64e6-f90b-4600-b2f3-136341b36dbb', 'True HEPA air purifier covering rooms up to 350 sq ft, with a quiet-night mode.', 129.00, true),
          (gen_random_uuid(), 'HOME-004', 'GlowNest LED Desk Lamp', '145d64e6-f90b-4600-b2f3-136341b36dbb', 'Dimmable LED desk lamp with adjustable color temperature and USB charging port.', 32.99, true),
          (gen_random_uuid(), 'HOME-005', 'ChopEase 8-Piece Knife Set', '145d64e6-f90b-4600-b2f3-136341b36dbb', '8-piece stainless steel knife set with a wooden block and built-in sharpener.', 89.99, true),
          (gen_random_uuid(), 'HOME-006', 'SoftRest Memory Foam Pillow', '145d64e6-f90b-4600-b2f3-136341b36dbb', 'Contoured memory foam pillow designed to relieve neck and shoulder tension.', 39.99, true),

          -- Audio
          (gen_random_uuid(), 'AUD-001', 'EchoBeam Bluetooth Speaker', '3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'Portable Bluetooth speaker with 360-degree sound and 20 hours of playback.', 79.99, true),
          (gen_random_uuid(), 'AUD-002', 'SilentWave ANC Headphones', '3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'Over-ear active noise-cancelling headphones with 30-hour battery life.', 199.99, true),
          (gen_random_uuid(), 'AUD-003', 'PulsePods True Wireless Earbuds', '3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'True wireless earbuds with a compact charging case and IPX4 sweat resistance.', 99.99, true),
          (gen_random_uuid(), 'AUD-004', 'VinylCraft Turntable', '3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'Belt-driven turntable with a built-in preamp and Bluetooth output.', 179.00, true),
          (gen_random_uuid(), 'AUD-005', 'StageMic USB Condenser Microphone', '3c8ce23c-f037-47d7-80fd-a06bb8bc5c04', 'Cardioid USB condenser microphone for podcasting, streaming, and voiceover work.', 89.99, true)
        ON CONFLICT (sku) DO NOTHING;
    """)
    # orders table
    orders_columns = {c["name"] for c in inspector.get_columns("orders")}
    if "order_number" not in orders_columns:
        op.add_column('orders', sa.Column('order_number', sa.String(length=50), nullable=True))
    if "payment_method" not in orders_columns:
        op.add_column('orders', sa.Column('payment_method', sa.String(), nullable=True))
    if "payment_status" not in orders_columns:
        op.add_column('orders', sa.Column('payment_status', sa.String(), nullable=True))
    if "payment_reference" not in orders_columns:
        op.add_column('orders', sa.Column('payment_reference', sa.String(length=255), nullable=True))
    if "payment_date" not in orders_columns:
        op.add_column('orders', sa.Column('payment_date', sa.DateTime(timezone=True), nullable=True))
    if "currency" not in orders_columns:
        op.add_column('orders', sa.Column('currency', sa.String(), nullable=True))

    # order_items table
    order_items_columns = {c["name"] for c in inspector.get_columns("order_items")}
    if "subtotal" not in order_items_columns:
        op.add_column('order_items', sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=True))
    if "product_name" not in order_items_columns:
        op.add_column('order_items', sa.Column('product_name', sa.String(length=255), nullable=True))
    if "product_sku" not in order_items_columns:
        op.add_column('order_items', sa.Column('product_sku', sa.String(length=100), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    order_items_columns = {c["name"] for c in inspector.get_columns("order_items")}
    if "product_sku" in order_items_columns:
        op.drop_column('order_items', 'product_sku')
    if "product_name" in order_items_columns:
        op.drop_column('order_items', 'product_name')
    if "subtotal" in order_items_columns:
        op.drop_column('order_items', 'subtotal')

    orders_columns = {c["name"] for c in inspector.get_columns("orders")}
    if "currency" in orders_columns:
        op.drop_column('orders', 'currency')
    if "payment_date" in orders_columns:
        op.drop_column('orders', 'payment_date')
    if "payment_reference" in orders_columns:
        op.drop_column('orders', 'payment_reference')
    if "payment_status" in orders_columns:
        op.drop_column('orders', 'payment_status')
    if "payment_method" in orders_columns:
        op.drop_column('orders', 'payment_method')
    if "order_number" in orders_columns:
        op.drop_column('orders', 'order_number')
