# Document 06: Automated Testing & Playwright Runbook

**Project:** Enterprise E-Commerce Platform

**Target Environment:** Local Pytest Runner, GitHub Actions CI Pipeline, Headless/Headed Playwright Engine

**Classification:** Automated Quality Assurance & Concurrency Verification Runbook

**Language Tone:** Technical Hinglish with Executable Code Suites

---

## 1. Testing Philosophy & Test Pyramid

Enterprise E-Commerce platform ka testing architecture critical financial correctness, zero over-selling, aur robust JWT session security enforce karne ke liye 3-tier pyramid follow karta hai:

```
                  ┌───────────────────────────────┐
                  │     Playwright E2E Suite      │  ◄── Critical Paths: Login, Cart Signals,
                  │     (Headless / Chromium)     │      Stripe/Mock Checkout, Order Confirmation
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │   Race-Condition Concurrency  │  ◄── Multi-threaded Async Checkout Tests,
                  │      & Integration Tests      │      Row-Level Pessimistic Lock Validation
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │   Pydantic & Service Layer    │  ◄── Unit Tests: Price Snapshotting,
                  │          Unit Tests           │      Tax Math, JWT Claims & Token Guards
                  └───────────────────────────────┘

```

### Core Testing Mandates:

1. **Total Test Isolation (Zero Database Poisoning):** Har integration test run ke baad database clean/truncate hona chahiye. `NullPool` aur transactional rollback fixtures use kiye jayenge.
2. **Deterministic Concurrency Simulation:** Race condition tests real multi-threaded workers (`concurrent.futures` ya `asyncio.gather`) execute karenge taaki confirm ho sake ki `SELECT FOR UPDATE` ke rehte inventory kabhi negative balance mein nahi jaati.
3. **External I/O Mocking:** Redis cloud calls aur third-party services unit testing stage par clean mocks ya local in-memory fallback use karenge.

---

## 2. Pytest Configuration & Test Fixtures (`conftest.py`)

Backend test suites ke liye baseline isolated fixtures setup:

```python
# tests/conftest.py
import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from app.main import app
from app.database.session import Base, get_db
from app.modules.auth.models.user import User, Role
from app.modules.catalog.models.product import Product

# Use dedicated test DB (SQLite in-memory or test PostgreSQL instance)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_ecommerce.db")

engine = create_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides an isolated DB session wrapped in a transaction rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

```

---

## 3. Unit & Integration Test Suites

### 3.1 Order Service & Financial Price Snapshotting (`test_order_service.py`)

```python
# tests/unit/orders/test_order_service_price_snapshot.py
import uuid
from decimal import Decimal
import pytest
from app.modules.catalog.models.product import Product
from app.modules.orders.models.order import Order
from app.modules.orders.schemas.order_dto import OrderCreateRequest, OrderItemRequest
from app.modules.orders.services.order_service import OrderProcessingService

def test_financial_price_snapshot_immutability(db_session):
    """
    Verifies that altering a catalog product's price AFTER checkout 
    does NOT alter the historical snapshot price on existing order line items.
    """
    # 1. Seed Product at Rs 1000.00
    product_id = uuid.uuid4()
    product = Product(
        id=product_id,
        title="Mechanical Keyboard",
        price=Decimal("1000.00"),
        stock_quantity=10
    )
    db_session.add(product)
    db_session.commit()

    user_id = uuid.uuid4()
    req = OrderCreateRequest(
        items=[OrderItemRequest(product_id=product_id, quantity=2)]
    )

    # 2. Checkout
    order = OrderProcessingService.create_order_with_pessimistic_lock(
        db=db_session, user_id=user_id, request=req
    )

    assert order.total_amount == Decimal("2000.00")
    assert order.items[0].unit_price_snapshot == Decimal("1000.00")

    # 3. Simulate Vendor Price Inflation (Rs 1000 -> Rs 1500)
    product.price = Decimal("1500.00")
    db_session.commit()

    # 4. Refetch Order from DB and assert immutability
    reloaded_order = db_session.query(Order).filter(Order.id == order.id).first()
    assert reloaded_order.items[0].unit_price_snapshot == Decimal("1000.00")
    assert reloaded_order.total_amount == Decimal("2000.00")

```

---

### 3.2 Race Condition & Pessimistic Concurrency Test (`test_concurrency_race.py`)

```python
# tests/integration/orders/test_concurrency_race.py
import uuid
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException
import pytest

from app.modules.catalog.models.product import Product
from app.modules.orders.schemas.order_dto import OrderCreateRequest, OrderItemRequest
from app.modules.orders.services.order_service import OrderProcessingService

def test_pessimistic_locking_prevents_overselling(db_session, setup_test_db):
    """
    Simulates 5 concurrent checkout threads attempting to purchase 
    the LAST single unit in stock (Stock = 1).
    Expectation: Exactly 1 checkout succeeds, 4 fail with HTTP 409 Conflict.
    Final stock MUST equal 0 (never negative).
    """
    product_id = uuid.uuid4()
    product = Product(
        id=product_id,
        title="Limited Edition Sneakers",
        price=Decimal("4999.00"),
        stock_quantity=1
    )
    db_session.add(product)
    db_session.commit()

    success_orders = []
    failure_exceptions = []

    def attempt_checkout(worker_id: int):
        # Dedicated session per thread
        from tests.conftest import TestingSessionLocal
        thread_db = TestingSessionLocal()
        user_id = uuid.uuid4()
        req = OrderCreateRequest(
            items=[OrderItemRequest(product_id=product_id, quantity=1)]
        )
        try:
            order = OrderProcessingService.create_order_with_pessimistic_lock(
                db=thread_db, user_id=user_id, request=req
            )
            success_orders.append(order.id)
        except HTTPException as exc:
            failure_exceptions.append(exc.status_code)
        finally:
            thread_db.close()

    # Dispatch 5 simultaneous checkout attempts
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(attempt_checkout, i) for i in range(5)]
        for f in futures:
            f.result()

    # Assertions
    assert len(success_orders) == 1, f"Expected exactly 1 success, got: {len(success_orders)}"
    assert len(failure_exceptions) == 4, f"Expected 4 conflicts, got: {len(failure_exceptions)}"
    assert all(status == 409 for status in failure_exceptions)

    # Re-verify stock balance
    db_session.expire_all()
    refetched_product = db_session.query(Product).filter(Product.id == product_id).first()
    assert refetched_product.stock_quantity == 0

```

---

## 4. Playwright End-to-End (E2E) Test Suite

### 4.1 E2E Configuration (`playwright.config.ts`)

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});

```

---

### 4.2 Critical User Path Test Spec (`critical_checkout_flow.spec.ts`)

```typescript
// e2e/tests/critical_checkout_flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E-Commerce Critical Customer Checkout Flow', () => {
  const TEST_USER = {
    email: 'test_customer@solvexa.com',
    password: 'Password123!'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to live application
    await page.goto('/auth/login');
  });

  test('Should login, add product to reactive Signals cart, and view customer orders', async ({ page }) => {
    // 1. Authentication
    await page.fill('input[formcontrolname="email"]', TEST_USER.email);
    await page.fill('input[formcontrolname="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Verify redirect to catalog
    await expect(page).toHaveURL(/.*\/products/);

    // 2. Add Product to Cart
    const firstProductCard = page.locator('.product-card').first();
    await expect(firstProductCard).toBeVisible();

    const addToCartButton = firstProductCard.locator('button.btn-add-cart');
    await addToCartButton.click();

    // Verify Signal Badge updates in Navbar
    const cartBadge = page.locator('[data-testid="cart-badge-count"]');
    await expect(cartBadge).toHaveText('1');

    // 3. Open Cart Drawer / Page
    await page.click('[data-testid="navbar-cart-link"]');
    await expect(page).toHaveURL(/.*\/cart/);

    const subtotalText = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotalText).toContainText('₹');

    // 4. Proceed to Checkout Simulation
    const checkoutBtn = page.locator('button.btn-checkout');
    await checkoutBtn.click();

    // 5. Verification on Orders History
    await expect(page).toHaveURL(/.*\/orders/);
    const orderRows = page.locator('table.orders-table tbody tr');
    await expect(orderRows.first()).toBeVisible();
    await expect(orderRows.first()).toContainText('PENDING_PAYMENT');
  });

  test('Admin RBAC Guard: Prevents non-admin customer from viewing /customers directory', async ({ page }) => {
    // Authenticate as regular customer
    await page.fill('input[formcontrolname="email"]', TEST_USER.email);
    await page.fill('input[formcontrolname="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/products/);

    // Attempt direct URL tampering to admin route
    await page.goto('/customers');

    // Expect Route Guard to bounce user back or show 403 Access Denied
    await expect(page).toHaveURL(/.*\/products/);
    const toastNotification = page.locator('.toast-error');
    await expect(toastNotification).toContainText(/Admin access required|Forbidden/i);
  });
});

```

---

## 5. Execution & CI/CD Runbook

### 5.1 Local Execution Steps

```bash
# 1. Run Backend Unit & Concurrency Tests
cd backend
pytest -v tests/unit/orders/test_order_service_price_snapshot.py
pytest -v tests/integration/orders/test_concurrency_race.py

# 2. Run Headless Playwright Tests
cd ../e2e
npm install
npx playwright install --with-deps chromium
E2E_BASE_URL="http://localhost:4200" npx playwright test

# 3. Interactive UI Mode (Visual Debugging)
npx playwright test --ui

```

### 5.2 GitHub Actions Pipeline Step (`.github/workflows/e2e-quality-gate.yml`)

```yaml
name: Production Quality & Concurrency Gate

on:
  pull_request:
    branches: [ develop, main ]

jobs:
  backend-concurrency-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install Dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run Pessimistic Lock Race Condition Tests
        run: |
          cd backend
          pytest -v tests/integration/orders/test_concurrency_race.py

  playwright-e2e-gate:
    needs: backend-concurrency-gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install E2E Dependencies
        run: |
          cd e2e
          npm ci
          npx playwright install --with-deps chromium
      - name: Run Headless Critical Path Specs
        env:
          E2E_BASE_URL: "https://ecommerce-platform-app-sable.vercel.app"
        run: |
          cd e2e
          npx playwright test

```
