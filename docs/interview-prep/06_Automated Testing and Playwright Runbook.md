# Document 06: Automated Testing and Playwright Runbook

**Project:** Enterprise E-Commerce Platform (`ecommerce-platform`)

**Tech Stack:** FastAPI, Pytest, Angular 19, Karma/Jasmine, Playwright E2E, GitHub Actions CI/CD

**Language:** Hinglish (Senior Systems & SDET Orientation)

---

## 1. Enterprise Testing Pyramid & Quality Gates

Is enterprise architecture mein testing strategy ko 4 hierarchical tiers mein strictly divide kiya gaya hai taaki fast feedback loop aur 100% regression defense mile:

```
                     / \
                    /   \
                   / E2E \          <-- Playwright (Critical User Journeys, RBAC, Checkout)
                  /-------\
                 / System  \        <-- Newman / Postman SIT Automation (API Contract)
                /   (SIT)   \
               /-------------\
              /  Integration  \     <-- Pytest TestClient + TestContainers / Postgres DB
             /-----------------\
            /    Unit Tests     \   <-- Pytest (FastAPI Services) & Karma/Jasmine (Angular)
           /---------------------\

```

### Coverage Thresholds & Quality Gates Baseline

* **Backend Coverage Gate:** 88% overall CI coverage across routers, services, and repositories.


* **Frontend Coverage Gate:** ~87% statement/line coverage aur ~68% branch coverage via Karma/Jasmine.


* **Unit Test Health:** 121+/124 passing unit tests with 0 test isolation leaks.


* **Build Verification:** Production bundling (`ng build`) with zero compilation errors and budget enforcement.



---

## 2. Backend Automated Testing Suite (Pytest & Async/Sync Engine)

Backend testing mein real transaction rollback isolation maintain ki jaati hai. Har test case clean database state par run hota hai bina production data pollute kiye.

### `backend/tests/conftest.py` (Database Fixtures & TestClient Setup)

```python
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.main import app
from app.database.session import Base, get_db
from app.core.security import create_access_token
from app.modules.users.models.user import User
from app.modules.users.models.role import Role

# Isolated In-Memory / Test PostgreSQL Engine
TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ecommerce_test_db"
engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create fresh schema before test suite and drop after completion."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provides transactional isolation per test case using nested rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Overrides get_db dependency to point to isolated test session."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def customer_auth_headers(db_session: Session) -> dict:
    """Generates authentic JWT token for a customer role."""
    customer_role = db_session.query(Role).filter_by(name="Customer").first()
    if not customer_role:
        customer_role = Role(name="Customer", description="Shopper")
        db_session.add(customer_role)
        db_session.commit()

    user = User(
        email="qa.customer@enterprise.com",
        hashed_password="secure_hashed_password",
        role_id=customer_role.id,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(data={"sub": user.email, "role": "Customer", "id": str(user.id)})
    return {"Authorization": f"Bearer {token}"}

```

### `backend/tests/orders/test_order_service.py` (Concurrency & Out-of-Stock Guard)

```python
import pytest
from fastapi import HTTPException
from app.modules.orders.services.order_service import OrderService
from app.modules.orders.schemas.order_schema import OrderCreateSchema, OrderItemCreateSchema
from app.modules.catalog.models.product import Product
from app.modules.catalog.models.inventory import Inventory

def test_order_creation_insufficient_stock_rollback(db_session):
    """
    Business Verification:
    Verify that if a customer attempts to purchase quantity > available stock,
    HTTPException(400) is raised, and inventory is NEVER modified.
    """
    # 1. Arrange Master Data
    product = Product(name="Enterprise Monitor", sku="COMP-101", price=15000.00, is_active=True)
    db_session.add(product)
    db_session.flush()

    inv = Inventory(product_id=product.id, stock_quantity=2)
    db_session.add(inv)
    db_session.commit()

    order_service = OrderService(db_session)
    order_payload = OrderCreateSchema(
        shipping_address="Hinjawadi Phase 1, Pune, MH - 411057",
        payment_method="COD",
        items=[OrderItemCreateSchema(product_id=product.id, quantity=5)]
    )

    # 2. Act & Assert Out-of-Stock Failure
    with pytest.raises(HTTPException) as exc_info:
        order_service.create_order(user_id=1, payload=order_payload)

    assert exc_info.value.status_code == 400
    assert "Insufficient stock" in exc_info.value.detail

    # 3. Assert Database Consistency (Inventory Unchanged)
    db_session.expire_all()
    reloaded_inv = db_session.query(Inventory).filter_by(product_id=product.id).one()
    assert reloaded_inv.stock_quantity == 2

```

---

## 3. Frontend Unit & Integration Testing (Angular 19, Karma, Jasmine)

Angular testing mein Signals ki reactivity aur asynchronous interceptors ko isolated mocks ke sath verify kiya jaata hai.

### `frontend/src/app/core/interceptors/auth.interceptor.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthInterceptor Integration', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach Bearer token to outgoing API requests when token exists', () => {
    authServiceSpy.getToken.and.returnValue('mock-token-xyz-123');

    http.get('/api/v1/orders').subscribe();

    const req = httpMock.expectOne('/api/v1/orders');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token-xyz-123');
    req.flush([]);
  });

  it('should bypass Authorization header on /auth/login to prevent preflight rejections', () => {
    authServiceSpy.getToken.and.returnValue('mock-token-xyz-123');

    http.post('/api/v1/auth/login', { username: 'test', password: 'password' }).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });
});

```

---

## 4. End-to-End Test Automation (Playwright Runbook)

Playwright directly production-like browser instances spawn karta hai aur real DOM state, network calls, aur navigation transitions ko validate karta hai.

### Directory Structure & Config

```text
e2e/
├── playwright.config.ts
├── package.json
├── fixtures/
│   └── auth.fixture.ts
├── pages/
│   ├── login.page.ts
│   ├── catalog.page.ts
│   └── checkout.page.ts
└── specs/
    ├── 01_auth_rbac.spec.ts
    ├── 02_checkout_flow.spec.ts
    └── 03_admin_metrics.spec.ts

```

### `e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }]
  ],
  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    }
  ],
});

```

### `e2e/specs/02_checkout_flow.spec.ts` (Full Customer Journey)

```typescript
import { test, expect } from '@playwright/test';

test.describe('E-Commerce Core Flow: Catalog to Order Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authenticate customer
    await page.goto('/login');
    await page.fill('[data-test="email-input"]', 'customer@example.com');
    await page.fill('[data-test="password-input"]', 'Customer@Pass123');
    await page.click('[data-test="login-submit-btn"]');
    await expect(page).toHaveURL('/products');
  });

  test('User can browse catalog, add item to cart, and place order via COD', async ({ page }) => {
    // 2. Locate first product card and click Add to Cart
    const firstProductCard = page.locator('.product-card').first();
    const productName = await firstProductCard.locator('.product-name').innerText();
    await firstProductCard.locator('[data-test="add-to-cart-btn"]').click();

    // 3. Verify Cart Badge updates via Signals
    const cartBadge = page.locator('[data-test="cart-count-badge"]');
    await expect(cartBadge).toHaveText('1');

    // 4. Navigate to Cart & Proceed to Checkout
    await page.click('[data-test="cart-nav-link"]');
    await expect(page).toHaveURL('/cart');
    await expect(page.locator('.cart-item-title')).toContainText(productName);
    await page.click('[data-test="proceed-to-checkout-btn"]');

    // 5. Fill Reactive Shipping Form
    await expect(page).toHaveURL('/checkout');
    await page.fill('[data-test="address-line-1"]', 'Flat 402, Royal Palms');
    await page.fill('[data-test="city-input"]', 'Pune');
    await page.fill('[data-test="state-input"]', 'Maharashtra');
    await page.fill('[data-test="pincode-input"]', '411057');

    // 6. Select COD Payment Method
    await page.check('[data-test="payment-cod-radio"]');

    // 7. Place Order
    await page.click('[data-test="place-order-btn"]');

    // 8. Assert Navigation to Order Confirmation
    await expect(page).toHaveURL(/\/orders\/success/);
    const confirmationBanner = page.locator('[data-test="order-success-title"]');
    await expect(confirmationBanner).toBeVisible();
    await expect(page.locator('.order-number-display')).toContainText('ORD-');
  });
});

```

---

## 5. CI/CD Pipeline Automation (GitHub Actions)

Production build aur automated tests ko enforce karne ke liye automated GitHub Actions pipeline configure kiya gaya hai.

### `.github/workflows/quality_gate.yml`

```yaml
name: Production Quality & Test Gates

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop, main ]

jobs:
  backend-quality-gate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: ecommerce_test_db
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:8
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Backend Dependencies
        run: |
          cd backend
          python -m pip install --upgrade pip
          pip install ruff black mypy pytest pytest-cov
          pip install -r requirements.txt

      - name: Static Analysis (Ruff & Black)
        run: |
          cd backend
          ruff check .
          black --check .

      - name: Run Pytest Suite with Coverage (Threshold: 85%)
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ecommerce_test_db
          REDIS_URL: redis://localhost:6379/0
          JWT_SECRET_KEY: ci_super_secret_test_key_32_bytes_len
        run: |
          cd backend
          pytest --cov=app --cov-report=xml --cov-fail-under=85 tests/

  frontend-quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 22.x
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Frontend Dependencies
        run: |
          cd frontend
          npm ci

      - name: Angular Production Build Check
        run: |
          cd frontend
          npm run build -- --configuration=production

      - name: Run Angular Headless Karma Tests with Coverage
        run: |
          cd frontend
          npm run test -- --no-watch --no-progress --browsers=ChromeHeadless --code-coverage

  playwright-e2e-gate:
    needs: [backend-quality-gate, frontend-quality-gate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build & Run Local Staging via Docker Compose
        run: |
          docker compose -f docker-compose.yml up -d --build
          # Wait for healthcheck ping
          docker compose exec -T backend curl --retry 10 --retry-delay 3 http://localhost:8000/api/v1/health

      - name: Install Playwright & Browsers
        run: |
          cd e2e
          npm ci
          npx playwright install --with-deps

      - name: Execute Playwright Test Suite
        run: |
          cd e2e
          npx playwright test

      - name: Archive Test Artifacts (Screenshots & Traces)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-failure-artifacts
          path: e2e/playwright-report/

```

---

## 6. Enterprise SIT Execution Runbook & Debugging Protocol

Jab test runs fail hote hain ya flaky behavior dikhta hai, engineer ko systematically isolate karna hota hai:

### Step 1: Flaky Test Isolation

1. **Network Race Conditions:** UI par buttons directly click karne ke bajaye hamesha Playwright ke built-in auto-waiting locators use karein:
```typescript
// Wrong: Manual fixed wait
await page.waitForTimeout(2000);
// Correct: Web-first assertion
await expect(page.locator('[data-test="cart-count-badge"]')).toHaveText('1');

```


2. **Database State Bleed:** Make sure ki `conftest.py` ka fixture `transaction.rollback()` properly execute ho raha ho. Kabhi bhi testing database mein direct commit call na karein fixture level ke bahar.



### Step 2: Postman / Newman Automated SIT Runner

Agar local headless environment mein API regression suite run karni ho:

```bash
# Execute Enterprise Postman Collection through Newman CLI
newman run postman/Enterprise_Ecommerce_SIT.postman_collection.json \
  -e postman/staging_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/sit_report.html \
  --bail

```

### Step 3: Fast Local Debugging Mode

```bash
# Run single Playwright spec in UI visual mode with step inspector
cd e2e
npx playwright test specs/02_checkout_flow.spec.ts --ui --debug

# Run isolated Pytest test case with stdout logs
cd backend
pytest -v -s tests/orders/test_order_service.py::test_order_creation_insufficient_stock_rollback

```