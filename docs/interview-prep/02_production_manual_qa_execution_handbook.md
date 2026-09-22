# Enterprise E-Commerce Platform: Production Manual QA Execution Handbook

**Document Version:** 1.0.0  
**Target Milestone:** Post-RC1 Production Baseline & Enterprise SIT Certification  
**Author:** Quality Assurance & Solution Architecture Group  
**Language:** Hinglish (Technical English with structured conversational Hindi execution notes)  

---

## 1. Executive QA Strategy & Certification Framework

### 1.1 Scope & Test Philosophy
Enterprise testing sirf happy-path UI verification nahi hoti. Is platform ka quality gate ensures:
1. **Stateless Security & RBAC Isolation:** Verification that unauthorized JWT tokens, corrupted signatures, and cross-customer query tampering (IDOR) return deterministic HTTP status codes (`401 Unauthorized`, `403 Forbidden`, `404 Not Found`).
2. **Transactional & Financial Consistency:** Validation that concurrent operations, stock decrements, and historical price snapshots execute without race conditions or rounding drift.
3. **Frontend Defensive State:** Zero UI crashes, zero console unhandled exceptions, zero Cumulative Layout Shift (CLS), and verified Material 3 contrast compliance across Light and Dark themes.

### 1.2 Baseline Execution Statistics
* **Unit Testing:** 121+/124 passing backend pytest suites and Angular component specs.
* **Coverage Gates:** 88% overall backend CI coverage; ~87% statement and ~68% branch coverage on the Angular frontend.
* **API Certification:** 100% passing Enterprise Postman SIT Collection with automated JWT environment variable chaining.

---

## 2. Pre-Execution Environment Verification (Phase 1 Gate)

Prior to executing test scenarios, execute this automated diagnostic runbook inside your terminal:

```bash
# 1. Inspect Docker Container Health
docker compose ps

# 2. Check Backend Health Diagnostic Endpoint
curl -i -X GET http://localhost:8000/health

# Expected HTTP 200 Response:
# HTTP/1.1 200 OK
# {"status":"healthy","database":"connected","redis":"connected"}

# 3. Verify Database Seed Baseline
docker compose exec backend python -c "
from app.database.session import SessionLocal
from app.modules.catalog.models.product import Product
from app.modules.orders.models.order import Order
db = SessionLocal()
print(f'Products Seed Count: {db.query(Product).count()}')
print(f'Orders Seed Count: {db.query(Order).count()}')
db.close()
"
# Expected: Products: 30, Orders: 8
```

---

## 3. End-to-End Test Matrix & Manual Test Cases

### 3.1 Authentication & RBAC Test Suite (AUTH)

| Test ID | Scenario / Feature | Test Steps | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Standard Customer Login | 1. Navigate to `/login`<br>2. Enter `customer@example.com` / `Customer@123`<br>3. Submit form | Navigates to `/catalog`, JWT and Refresh tokens written to local storage, user session signals initialized. | **Critical** |
| **TC-AUTH-02** | Admin Role Login & Sidebar Isolation | 1. Navigate to `/login`<br>2. Enter `admin@example.com` / `Admin@123`<br>3. Inspect sidebar navigation | Admin Dashboard route appears in sidebar; customer cart/checkout quick actions are contextually hidden. | **Critical** |
| **TC-AUTH-03** | Customer Attempting Admin API (RBAC Guard) | 1. Login as `customer@example.com`<br>2. Grab access token<br>3. Execute `GET /api/v1/admin/dashboard` | Backend aborts request with `HTTP 403 Forbidden` (`{"detail": "Operation not permitted"}`). | **Critical** |
| **TC-AUTH-04** | Dual-Token Silent Refresh Flow | 1. Login as customer<br>2. Wait 15 mins (or invalidate access token header manually)<br>3. Trigger authenticated call to `/api/v1/orders` | Auth interceptor traps 401, calls `/api/v1/auth/refresh`, replaces token, and replays original order request seamlessly. | **High** |
| **TC-AUTH-05** | Complete Session Termination (Logout) | 1. Click user menu -> Logout<br>2. Inspect browser Application Storage<br>3. Press Browser 'Back' button | Local storage wiped; auth signals reset to null; browser back button triggers `AuthGuard` redirecting to `/login`. | **High** |

---

### 3.2 Catalog & Static Vector Asset Suite (CAT)

| Test ID | Scenario / Feature | Test Steps | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CAT-01** | Full Catalog Rendering & Pagination | 1. Navigate to `/products`<br>2. Observe grid view | Exactly 30 seeded products load. Loading skeletons render during fetch, eliminating layout shifts. | **High** |
| **TC-CAT-02** | Static SVG Asset Pipeline Integrity | 1. Inspect any product image in browser DevTools<br>2. Check network response headers | Image URL resolves to `/static/product_images/<slug>.svg` with `HTTP 200 OK` and `Content-Type: image/svg+xml`. | **Medium** |
| **TC-CAT-03** | Dynamic Full-Text Search | 1. Focus search bar in toolbar<br>2. Type "Ultrabook"<br>3. Clear and type "Mechanical" | Catalog filters in real-time. "Nimbus 14 Ultrabook" and "TypeCraft Mechanical Keyboard" isolate correctly. | **Medium** |
| **TC-CAT-04** | Category Filtering | 1. Select category chip "Gaming"<br>2. Inspect displayed items | Only products tagged with `Gaming` render. URL query params update reactively. | **Medium** |

---

### 3.3 Reactive Cart & Pricing Suite (CART)

| Test ID | Scenario / Feature | Test Steps | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **TC-CART-01** | Signal State Mutation (Add to Cart) | 1. Click "Add to Cart" on *VoltCharge 65W GaN Charger* (₹34.99)<br>2. Observe top bar badge | Cart count increments to `1`; total updates immediately via computed signals without full DOM reload. | **Critical** |
| **TC-CART-02** | Quantity Modification & INR Recalculation | 1. Open cart drawer / view<br>2. Increment quantity to 3<br>3. Inspect line subtotal | Total renders as ₹104.97 (`3 * 34.99`). Currency pipe strictly displays Indian Rupee (`₹`) prefix. | **High** |
| **TC-CART-03** | Stock Ceiling Boundary Check | 1. Attempt to increment quantity beyond available inventory (e.g. 999) | Action button disables or toast triggers warning: "Maximum available stock limit reached". | **High** |
| **TC-CART-04** | Remove Item & Empty State Display | 1. Click delete icon on all items in cart | Cart clears. `EmptyStateComponent` renders with illustration and "Browse Catalog" CTA button. | **Medium** |

---

### 3.4 Checkout, Order Creation & Snapshot Pricing (CHK/ORD)

```
[ Step 1: User Cart ] ──► [ Step 2: Shipping Form ] ──► [ Step 3: Payment Choice ] ──► [ Step 4: DB Snapshot ]
  Items: 2x COMP-002       Address: Baner, Pune-411045   Method: COD / Razorpay         Locks unit_price: 1599.00
```

| Test ID | Scenario / Feature | Test Steps | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ORD-01** | Structured Shipping Address Validation | 1. Proceed to `/checkout`<br>2. Leave PIN code empty or enter 4 digits<br>3. Attempt to place order | Form submit disabled. PIN field displays error: "Valid 6-digit postal PIN code required". | **High** |
| **TC-ORD-02** | Multi-Item Order Creation & Serialized String | 1. Enter: Line1="Flat 402", City="Pune", State="MH", Pin="411045"<br>2. Select "Cash on Delivery"<br>3. Submit | Backend returns `HTTP 201 Created`. Shipping address serialized as `"Flat 402, Pune, MH - 411045"`. | **Critical** |
| **TC-ORD-03** | Snapshot Pricing Immutability Proof | 1. Note created order total (e.g., ₹1,599.00 for `COMP-002`)<br>2. In DB, update `products.price = 2500.00`<br>3. Refresh order details page | Order item unit price remains ₹1,599.00. Invoice calculations do not fluctuate with catalog updates. | **Critical** |
| **TC-ORD-04** | Order Cancellation & Inventory Restoration | 1. Open customer order history<br>2. Click "Cancel Order" on `PENDING` order<br>3. Confirm in dialog | Order status transitions to `CANCELLED`. Associated product inventory is safely credited back to stock. | **High** |
| **TC-ORD-05** | IDOR Security Boundary Test | 1. Authenticate as Customer A<br>2. Direct GET request to `/api/v1/orders/{Order_of_Customer_B}` | API returns `HTTP 404 Not Found` (never 200, never leaking another customer's metadata). | **Critical** |

---

### 3.5 Administrative Dashboard & Management Engine (ADM)

| Test ID | Scenario / Feature | Test Steps | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ADM-01** | KPI Metrics Aggregation | 1. Login as Admin<br>2. Navigate to `/admin/dashboard`<br>3. Inspect KPI Cards | Displays live Total Revenue, Total Order Count, and Active Catalog Count without calculation errors. | **High** |
| **TC-ADM-02** | Recent Orders Table Joined Load | 1. Inspect recent orders section on dashboard | Displays 5 most recent orders with Customer Email (e.g. `customer@example.com`) without N+1 query lag. | **Medium** |
| **TC-ADM-03** | Order Status Dispatch Lifecycle | 1. Open order `ORD-100000`<br>2. Update status from `PENDING` to `PROCESSING` to `SHIPPED` | Status updates smoothly. Invalid state transitions (e.g., `SHIPPED` -> `PENDING`) are disabled in UI. | **High** |

---

## 4. Edge-Case Scenarios & Fail-Safe QA Recipes

### Recipe 1: Simulating Inventory Depletion via cURL
Run concurrent order calls to trigger the inventory concurrency safety net:
```bash
# Order 10 items when only 3 exist:
curl -i -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": "Test Street, Pune, MH - 411045",
    "payment_method": "COD",
    "items": [{"product_id": "c1f727c9-4a0b-48d6-993d-82d778d9b1a2", "quantity": 999}]
  }'

# Expected:
# HTTP/1.1 400 Bad Request
# {"detail": "Insufficient stock for product ELEC-005"}
```

### Recipe 2: Verifying SQL Injection & Malformed DTO Payload
```bash
# Attempt to inject SQL into shipping_address or pass negative quantity:
curl -i -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer <CUSTOMER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address": "Valid Address; DROP TABLE orders; --",
    "payment_method": "COD",
    "items": [{"product_id": "c1f727c9-4a0b-48d6-993d-82d778d9b1a2", "quantity": -5}]
  }'

# Expected:
# HTTP/1.1 422 Unprocessable Entity
# Pydantic v2 rejects negative quantity; SQLAlchemy parameterized statements prevent SQL injection.
```

---

## 5. Enterprise Postman SIT Runbook

Automated regression suite execution instructions:

```
[ Postman Collection Runner ]
         │
         ├── 1. Auth: POST /auth/login ──────────► Extracts 'accessToken' to Collection Env
         ├── 2. Catalog: GET /products ──────────► Captures first 'productId' and 'productSku'
         ├── 3. Orders: POST /orders ────────────► Creates order, verifies 201 Created & snapshots
         ├── 4. Admin: GET /admin/dashboard ─────► Checks KPIs with Bearer token
         └── 5. Cleanup / Status Updates ────────► Asserts state transition & returns 200 OK
```

### Execution Steps:
1. Import `Enterprise_Ecommerce_SIT.postman_collection.json` into Postman or Newman CLI.
2. Select Environment `Staging-Docker-Local`.
3. Set Collection Variable `baseUrl` = `http://localhost:8000/api/v1`.
4. Run complete collection (5 iterations, 0 delay).
5. **Expected Outcome:** 100% assertions green, 0 unhandled exceptions.

---

## 6. QA Release Sign-Off Checklist

- [ ] All 30 seeded SVG product images load without broken image icons.
- [ ] Cart state accurately updates total and badge using Angular Signals.
- [ ] Structured address form enforces 6-digit postal PIN code format.
- [ ] Historical prices remain unchanged on existing orders when catalog prices are altered.
- [ ] Customer cannot view or modify administrative dashboard endpoints (`HTTP 403`).
- [ ] Cross-tenant order inspection returns `HTTP 404 Not Found`.
- [ ] Browser console remains free of unhandled runtime exceptions during complete user journeys.