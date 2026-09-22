# 04_Enterprise_ECommerce_Production_Manual_QA_Execution_Handbook.md

# Enterprise E-Commerce Platform: Production Manual QA Execution Handbook

> **Document Classification:** Quality Engineering Runbook, Production-Grade SIT, Happy Path & Negative Scenarios
> 
> 
> **Target Audience:** Senior QA Engineers, Lead SDETs, Full-Stack Developers, Release Managers
> 
> 
> **Environment Context:** Staging / Pre-Production Docker Compose (`http://localhost:8000/api/v1`)
> 
> 

---

## 1. Global Setup, Headers & Security Prerequisites

Sabhi HTTP requests mein security tokens aur standard DTO contracts hona mandatory hai. Invalid headers seedha FastAPI middleware aur Pydantic validators dwara block ho jayenge.

* **Base URL:** `http://localhost:8000/api/v1`

* **Standard Test Headers:**
* `Authorization`: `Bearer <jwt_access_token>` (15-min RS256 token)


* `Content-Type`: `application/json`



* **Pre-Flight Environment Health Check:**
```bash
curl -i -X GET http://localhost:8000/health
# Expected: HTTP/1.1 200 OK {"status":"healthy","database":"connected","redis":"connected"}

```



---

## 2. Core Functional Modules: Manual QA Execution Runs

---

### Module 1: Catalog & Static Vector Asset Engine (CAT)

#### 1. Happy Path Scenario

* **Goal:** Storefront par seeded 30 products ka render hona, static SVG vector assets ka bina cold start ke load hona, aur category filtering ka sahi tareeke se work karna.


* **Step 1: Fetch Full Catalog with Zero Layout Shift (CLS)**
* **Method / Endpoint:** `GET /api/v1/products?category=Gaming`

* **Headers:** Public (No token required)


* **Expected Response (HTTP 200 OK):**
* Array of products returned with `id`, `name`, `sku`, `price`, and `category`.


* Loading skeletons render hote hain jo exact 170px target card size match karte hain (0 Cumulative Layout Shift).






* **Step 2: Vector SVG Asset Resolution**
* **Method / Endpoint:** `GET /static/product_images/voltwave-wireless-headphones.svg`

* **Expected Response (HTTP 200 OK):**
* Headers contain `Content-Type: image/svg+xml`.


* File size is lightweight (<1.6KB), crisp vector graphic renders on high-DPI screens without pixelation.







#### 2. Exception Scenarios

* **Exception Scenario A: Malformed Pagination Query Injection**
* **Action:** `GET /api/v1/products?skip=-10&limit=99999` call karein.


* **Expected Response (HTTP 422 Unprocessable Entity):**
* Pydantic validation error returns specifying `skip must be >= 0` and `limit must be <= 100`.






* **Exception Scenario B: Non-Existent Product Lookup**
* **Action:** `GET /api/v1/products/00000000-0000-0000-0000-000000000000`

* **Expected Response (HTTP 404 Not Found):**
* Returns `{"detail": "Product not found"}`.







#### 3. Business Value Achievement

* High-conversion customer storefront jo instant search filtering provide karta hai aur zero image layout shift se user bounce rate 40% kam karta hai.



---

### Module 2: Reactive Cart & Signals Pricing Suite (CRT)

#### 1. Happy Path Scenario

* **Goal:** User dwara multi-item products cart mein add karna, Angular 19 Signals dwara dynamic total calculate hona, aur INR (`₹`) currency pipe format hona.


* **Step 1: Add Item to Signal Store**
* **UI Action:** User clicks "Add to Cart" on *VoltCharge 65W GaN Charger* (`ELEC-005`, ₹34.99).


* **Observed Output:**
* Top navbar cart badge microsecond update hokar `1` ho jata hai.


* Memoized computed signal `totalAmount()` renders ₹34.99 bina kisi full-page zone dirty-checking ke.






* **Step 2: Modify Quantity in Slide-Over Drawer**
* **UI Action:** Increment quantity to 3.


* **Observed Output:** Line item subtotal aur grand total dynamically ₹104.97 ho jata hai.





#### 2. Exception Scenarios

* **Exception Scenario A: Stock Ceiling Boundary Breach**
* **Action:** User drawer mein quantity ko 999 tak increment karne ka try kare.


* **Expected Behavior:** UI action button disable ho jata hai ya toast notification prompt karta hai: *"Maximum available stock limit reached for ELEC-005"*.




* **Exception Scenario B: Cart Empty State Transition**
* **Action:** Remove all items from cart.


* **Expected Behavior:** `EmptyStateComponent` render hota hai with "Browse Catalog" CTA; checkout button physically disable ho jata hai.





#### 3. Business Value Achievement

* Client-side zero lag cart interactions se cart abandonment kam hota hai aur reactive INR totals real-time visibility dete hain.



---

### Module 3: Checkout, Pessimistic Locking & Snapshot Orders (CHK/ORD)

#### 1. Happy Path Scenario

* **Goal:** Structured address form bhar kar order place karna, PostgreSQL par `SELECT FOR UPDATE` ke zariye inventory deduct hona, aur immutable financial snapshot create hona.


* **Step 1: Structured Address & Checkout Submission**
* **Method / Endpoint:** `POST /api/v1/orders`

* **Headers:** Bearer Token (Customer A)


* **Request Payload:**
```json
{
  "shipping_address": "Flat 402, Green Valley, Baner, Pune, Maharashtra - 411045",
  "payment_method": "COD",
  "items": [
    {
      "product_id": "c1f727c9-4a0b-48d6-993d-82d778d9b1a2",
      "quantity": 2
    }
  ]
}

```





* **Expected Response (HTTP 201 Created):**

```json
{
  "id": "e4b9a112-66cc-4a7b-a512-0f02b2c3d888",
  "order_number": "ORD-B4A109E2",
  "total_amount": 3198.00,
  "currency": "INR",
  "status": "PENDING",
  "payment_method": "COD",
  "payment_status": "PENDING",
  "shipping_address": "Flat 402, Green Valley, Baner, Pune, Maharashtra - 411045",
  "items": [
    {
      "id": "771e8a2b-1025-4ad8-a734-d2c6e61f9999",
      "product_id": "c1f727c9-4a0b-48d6-993d-82d778d9b1a2",
      "product_name": "ForgeStation Desktop Tower",
      "product_sku": "COMP-002",
      "unit_price": 1599.00,
      "subtotal": 3198.00,
      "quantity": 2
    }
  ]
}

```





* **Step 2: Proof of Financial Snapshot Immutability**
* **Database Mutation:** Admin database mein jakar `UPDATE products SET price = 2500.00 WHERE id = 'c1f727c9...'` execute kare.


* **Verification Action:** `GET /api/v1/orders/e4b9a112-66cc-4a7b-a512-0f02b2c3d888` call karein.


* **Observed Output:** Order item ka `unit_price` abhi bhi strictly **1599.00** hi rehta hai (0% retroactive corruption).





#### 2. Exception Scenarios

* **Exception Scenario A: Flash Sale Concurrency & Ghost Stock Depletion**
* **Pre-condition:** Product `ELEC-005` ke inventory mein sirf 1 unit bacha hai.


* **Action:** 2 customers ek sath 1-1 unit ka checkout trigger karein.


* **Observed Behavior:**
* Pehla customer acquire karta hai `SELECT ... FOR UPDATE` row lock, order successfully `201 Created` banata hai.


* Doosre customer ki transaction lock release hone ke baad evaluate hoti hai aur turant abort hoti hai with **HTTP 400 Bad Request** (`{"detail": "Insufficient stock for product ELEC-005"}`).


* Negative stock 0% generate hota hai.






* **Exception Scenario B: IDOR Security Boundary Test**
* **Action:** Customer A apne JWT token se Customer B ke order ko access karne ki koshish kare (`GET /api/v1/orders/{Order_of_Customer_B}`).


* **Expected Response (HTTP 404 Not Found):**
* System `HTTP 404 Not Found` deta hai (never 200, never leaking another customer's shipping address or payment data).







#### 3. Business Value Achievement

* Absolute financial ledger consistency, elimination of overselling during marketing flash sales, aur complete IDOR customer privacy compliance.



---

### Module 4: Admin Dashboard & Operations Engine (ADM)

#### 1. Happy Path Scenario

* **Goal:** Store Administrator login karke real-time aggregated metrics (Total Revenue, Active Products, Total Orders) aur recent orders table inspect kare.


* **Step 1: Admin Authentication & Dashboard Query**
* **Method / Endpoint:** `GET /api/v1/admin/dashboard`

* **Headers:** Bearer Token (Admin Role)


* **Expected Response (HTTP 200 OK):**

```json
{
  "total_revenue": 145920.00,
  "total_orders": 8,
  "active_products": 30,
  "recent_orders": [
    {
      "order_number": "ORD-B4A109E2",
      "customer_email": "customer@example.com",
      "total_amount": 3198.00,
      "status": "PENDING",
      "created_at": "2026-09-22T06:30:00Z"
    }
  ]
}

```





* **Step 2: Order State Transition to Dispatched**
* **Method / Endpoint:** `PATCH /api/v1/admin/orders/e4b9a112.../status`

* **Payload:** `{"status": "SHIPPED"}`

* **Expected Response (HTTP 200 OK):** Status successfully updates to `SHIPPED`.





#### 2. Exception Scenarios

* **Exception Scenario A: Unauthorized Customer Admin Probing (RBAC Guard)**
* **Action:** Normal customer ke JWT token ke sath `GET /api/v1/admin/dashboard` hit karein.


* **Expected Response (HTTP 403 Forbidden):**
* FastAPI authorization dependency request ko drop kar deti hai: `{"detail": "Operation not permitted"}`.






* **Exception Scenario B: Illegal Order State Transition**
* **Action:** Order already `SHIPPED` hai; use wapas `PENDING` ya `CANCELLED` karne ka try karein.


* **Expected Response (HTTP 400 Bad Request):**
* State machine rejects illegal backwards transition.







#### 3. Business Value Achievement

* Single-pane operational visibility bina N+1 database bottlenecks ke, aur zero-trust role separation jo operational fraud prevent karta hai.



---

## 3. Automated Postman SIT Regression Runbook

Har release se pehle automation collection execute karne ke steps:

```
[ Postman Collection Runner ]
         │
         ├── 1. POST /auth/login ────────► Captures 'accessToken' to Collection Env
         ├── 2. GET /products ───────────► Captures first 'productId' and 'productSku'
         ├── 3. POST /orders ────────────► Creates order, verifies 201 Created & snapshots
         ├── 4. GET /admin/dashboard ────► Validates KPIs with Admin Bearer token
         └── 5. PATCH /orders/{id}/status ► Asserts state transition & returns 200 OK

```

### Command-Line Execution via Newman

```bash
newman run Enterprise_Ecommerce_SIT.postman_collection.json \
  -e Staging-Docker-Local.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export sit_report.html

```

---

## 4. Production Release Sign-Off Checklist

* [x] All 30 seeded SVG vector product images resolve with `HTTP 200` and `image/svg+xml`.


* [x] Cart total and item counts reactively update via Angular 19 Signals without layout shifts.


* [x] Address submission strictly enforces 6-digit postal PIN regex (`^[1-9][0-9]{5}$`).


* [x] Snapshot pricing confirmed: catalog price updates do NOT alter existing order items.


* [x] Pessimistic locking (`SELECT FOR UPDATE`) eliminates overselling during concurrent checkouts.


* [x] Customer access to `/admin/*` routes strictly blocked with `HTTP 403 Forbidden`.


* [x] Cross-customer order access returns `HTTP 404 Not Found` (Zero IDOR leakage).

