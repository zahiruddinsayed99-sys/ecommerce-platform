# Enterprise E-Commerce Platform: Master Architecture & Interview Handbook

**Document Version:** 1.0.0

**Target Milestone:** Post-RC1 Production Baseline & Senior Engineering / Solution Architect Interview Mastery

**Author:** Platform Engineering Team

**Language:** Hinglish (Technical English with conversational Hindi structural explanations)

## 1. Executive Summary & Core Platform Overview

### 1.1 Project Mission & Problem Statement

The **Enterprise E-Commerce Platform** is a production-grade, highly resilient, decoupled commerce application built to handle complex customer purchasing lifecycles and administrative enterprise operations. Tutorial e-commerce applications typically implement simple CRUD over coupled databases with fragile frontends. This platform solves realistic distributed enterprise challenges:

* **State Drift & Financial Integrity:** Prevents price tampering, inconsistent inventory tracking, and race conditions during concurrent checkouts.

* **Strict Role-Based Multi-Tenancy (RBAC):** Guarantees zero cross-customer data leakage and complete UI/API isolation between Customer Portal and Admin Management.

* **Enterprise Frontend Reactivity:** Eliminates manual zone/subscription overhead in Angular 19 using fine-grained Signals and `OnPush` change detection.

* **Clean Architecture Monolith:** Avoids premature distributed microservice penalties (network latency, distributed transaction orchestration) while preserving domain isolation via clean layer contracts (Routers -> Services -> Repositories -> Models).

### 1.2 Quantitative Baseline & Release Health

* **Backend Quality Baseline:** 88% overall test coverage across routers, domain services, and repository layers in Python 3.12 / FastAPI.

* **Frontend Quality Baseline:** \~87% line coverage and \~68% branch coverage in Angular 19.

* **API Stability:** 100% passing Enterprise Postman / Newman SIT test suites. Zero broken contracts or unhandled exceptions across 30 seeded catalog products, 8 orders, and 18 order snapshot items.

* **Asset Pipeline Performance:** Static SVG architecture delivers 30 lightweight, vector-rendered product assets (<1.6KB per asset) directly via mounted FastAPI static routers, bypassing expensive third-party blob cold starts for the MVP release candidate.

## 2. End-to-End High-Level Architecture (C4 Model)

### 2.1 C4 Level 1: System Context Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    INTERNET CLIENTS                                     |
|                                                                                         |
|       +------------------------------------+   +------------------------------------+   |
|       |          Customer Browser          |   |          Admin Workstation         |   |
|       |  (Storefront, Cart, Checkout, PWA) |   |    (Catalog, Metrics, Operations)  |   |
|       +-----------------+------------------+   +-----------------+------------------+   |
+-------------------------|----------------------------------------|----------------------+
                          |                                        |
                          | HTTPS / REST APIs                      | HTTPS / REST APIs
                          v                                        v
+-----------------------------------------------------------------------------------------+
|                           ENTERPRISE E-COMMERCE PLATFORM BOUNDARY                       |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                        NGINX / INGRESS REVERSE PROXY LAYER                        |  |
|  |                   - SSL Termination & Strict Security Headers                     |  |
|  |                   - Static Asset Caching (/static/product_images)                 |  |
|  +-----------------------------------------+-----------------------------------------+  |
|                                            | Forwarded Requests                         |
|                                            v                                            |
|  +-----------------------------------------------------------------------------------+  |
|  |                 ANGULAR 19 SPA (SINGLE PAGE APPLICATION HOST)                     |  |
|  |   - Standalone Components, Material 3 Design System, Reactive Signal Store         |  |
|  |   - Functional Guards (authGuard, roleGuard), Dynamic HTTP Interceptors           |  |
|  +-----------------------------------------+-----------------------------------------+  |
|                                            | API Calls (/api/v1/*)                      |
|                                            v                                            |
|  +-----------------------------------------------------------------------------------+  |
|  |                FASTAPI CORE SERVICE ENGINE (MODULAR MONOLITH)                     |  |
|  |  +-------------------+ +--------------------+ +-----------------+ +---------------+  |
|  |  |   Auth Service    | |   Catalog Service  | |  Orders Service | | Metrics Service|  |
|  |  |  (JWT/RBAC/OAuth) | |  (Products/Stock)  | |  (Checkout/SIT) | | (Admin Engine) |  |
|  |  +-------------------+ +--------------------+ +-----------------+ +---------------+  |
|  |                                         |                                         |  |
|  |                                         | SQLAlchemy 2.x ORM                      |  |
|  +-----------------------------------------|-----------------------------------------+  |
|                                            |                                            |
|                    +-----------------------+-----------------------+                    |
|                    v                                               v                    |
|  +------------------------------------+         +------------------------------------+  |
|  |     POSTGRESQL 17 PRIMARY RELATIONAL|         |         REDIS 8 IN-MEMORY CACHE    |  |
|  |     DATABASE                        |         |  - Catalog & Category Cache        |  |
|  |  - Acid Transactions                |         |  - Fast Key-Value Session Inval    |  |
|  |  - Enums (OrderStatus, Currency)    |         |  - High Performance Read Offload   |  |
|  +------------------------------------+         +------------------------------------+  |
+-----------------------------------------------------------------------------------------+
                                             |
                                             | HTTPS Webhooks / API Checkout
                                             v
+-----------------------------------------------------------------------------------------+
|                                EXTERNAL PAYMENT PROVIDER                                |
|                                                                                         |
|                            RAZORPAY PAYMENT GATEWAY INFRASTRUCTURE                       |
|                   - Order Pre-capture, Tokenization, Signatures                         |
|                   - Asynchronous Webhook State Machine Ingestion                       |
+-----------------------------------------------------------------------------------------+

```

### 2.2 C4 Level 2: Container Diagram & Internal Modular Interactions

The application executes within an orchestrated multi-container Docker Compose staging environment:

1. **`ecommerce-frontend` Container:** Nginx serves compiled Angular 19 production artifacts. Route splitting ensures administrative chunks are never parsed during storefront initialization.

2. **`ecommerce-backend` Container:** Uvicorn ASGI server executing Python 3.12 with FastAPI. Runs under isolated non-root privileges. Directly controls database connection pools via synchronous SQLAlchemy sessions.

3. **`ecommerce-db` Container:** PostgreSQL 17 configured with transaction isolation, strict Foreign Key constraints, and custom PostgreSQL ENUM types.

4. **`ecommerce-cache` Container:** Redis 8 Alpine instance serving TTL-invalidated catalog data and query buffers.

## 3. Detailed Architectural Layers & Clean Architecture Implementation

```
               [ HTTP Request ]
                       │
                       ▼
       ┌───────────────────────────────┐
       │     FastAPI Router Layer      │  ◄── DTO Input Validation (Pydantic v2)
       │  (Thin, Status Codes, Auth)   │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │     Domain Service Layer      │  ◄── Business Logic, Totals Calculation,
       │   (Pure Business Orchestrator)│      Inventory Allocation, Snapshot Pricing
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │      Repository Layer         │  ◄── Persistence Only, Query Building,
       │ (SQLAlchemy ORM Data Access)  │      Joined Loads, Aggregations
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │   PostgreSQL 17 Database      │  ◄── Tables, Enums, Constraints, Indexes
       └───────────────────────────────┘

```

### 3.1 The Router Layer (Thin Presentation)

* **Role:** Pure request ingestion and response serialization. Routers never execute raw SQL, compute currency totals, or modify transactional context.

* **Contract Enforcement:** Har endpoint strictly `response_model` declare karta hai. Empty `{}` JSON serialization defects are completely eliminated.

* **Status Code Standard:** POST operations return `HTTP 201 Created`; updates return `HTTP 200 OK`; idempotent updates or deletes return `HTTP 204 No Content` or `200 OK` with detailed DTO payload.

### 3.2 The Service Layer (Domain Orchestration Engine)

* **Separation of Concerns:** Business validation, transaction orchestration, total calculations, and price historical snapshots exclusively reside here.

* **The Core Rule:** *Service methods that mutate state receive and return SQLAlchemy ORM entities, while routers handle Pydantic DTO transformations.* This eliminates the critical defect discovered during Sprint 4.6 SIT where mutation services received plain dictionaries instead of persistent database models.

### 3.3 The Repository Layer (Clean Persistence)

* **Persistence Exclusivity:** Repositories only communicate with `db.session`. They contain zero logic regarding whether an order is eligible for cancellation or how tax is calculated.

* **Standardized Methods:**

  * `get_by_id(id: UUID)`: Fetches an entity by primary key.

  * `list_all(skip: int, limit: int)`: Supports efficient paginated queries.

  * `create(entity)` / `update(entity)` / `delete(id)`: Standard persistence lifecycles.

  * Special joined queries: E.g., `joinedload(Order.user)` and `joinedload(Order.items)` to prevent N+1 query disasters.

## 4. Database Schema, Data Models & Alembic Migration Topology

```
                  ┌────────────────────────┐
                  │         ROLES          │
                  ├────────────────────────┤
                  │ id (PK)                │
                  │ name (VARCHAR)         │
                  └───────────┬────────────┘
                              │
                              │ 1:N
                              ▼
┌──────────────────┐    ┌────────────────────────┐
│    CATEGORIES    │    │         USERS          │
├──────────────────┤    ├────────────────────────┤
│ id (PK)          │    │ id (PK)                │
│ name (VARCHAR)   │    │ role_id (FK)           │
│ slug (VARCHAR)   │    │ email (UNIQUE)         │
└────────┬─────────┘    │ hashed_password (STR)  │
         │              └───────────┬────────────┘
         │ 1:N                      │
         ▼                          │ 1:N
┌──────────────────┐                │
│     PRODUCTS     │                │
├──────────────────┤                │
│ id (PK)          │                │
│ category_id (FK) │                │
│ sku (UNIQUE)     │                │
│ name (VARCHAR)   │                │
│ price (NUMERIC)  │                │
│ image_url (TEXT) │                │
└────────┬─────────┘                │
         │                          │
         │ 1:1                      │
         ▼                          ▼
┌──────────────────┐    ┌────────────────────────┐
│    INVENTORY     │    │         ORDERS         │
├──────────────────┤    ├────────────────────────┤
│ id (PK)          │    │ id (PK)                │
│ product_id (FK)  │    │ user_id (FK)           │
│ stock_quantity   │    │ order_number (UNIQUE)  │
│ reserved_quantity│    │ status (ENUM)          │
└──────────────────┘    │ total_amount (NUMERIC) │
                        │ payment_method (ENUM)  │
                        │ payment_status (ENUM)  │
                        │ currency (ENUM)        │
                        │ shipping_address (TEXT)│
                        └───────────┬────────────┘
                                    │
                                    │ 1:N
                                    ▼
                        ┌────────────────────────┐
                        │      ORDER_ITEMS       │
                        ├────────────────────────┤
                        │ id (PK)                │
                        │ order_id (FK)          │
                        │ product_id (FK)        │
                        │ quantity (INT)         │
                        │ unit_price (NUMERIC)   │◄── Snapshot Price
                        │ subtotal (NUMERIC)     │◄── Snapshot Subtotal
                        │ product_name (STR)     │◄── Historical Snapshot
                        │ product_sku (STR)      │◄── Historical Snapshot
                        └────────────────────────┘

```

### 4.1 Schema Evolution Ledger & Alembic Linearization

During earlier sprints, database revisions experienced a broken tree hash issue (`KeyError: 9b2f4f6c7a81`). The migration graph was linearized into a clean, deterministic revision chain:

1. **`400c87388bd6` (Core Authentication):** Baseline schema defining relational tables for `roles` and `users` with initial administrative and customer seeds.

2. **`d8a6f0b93c41` (Catalog Master Data Support):** Introduced `categories`, `products`, and `inventory` tables. Safely backfilled legacy null SKU columns using `'LEGACY-' || id`.

3. **`b1c2d3e4f5a6` (Product Extensions):** Added nullable `image_url` string column with static SVG route resolution.

4. **`c7d8e9f0a1b2` (Order Pipeline Extension):** Introduced enterprise snapshot fields on `orders` and `order_items`, custom PostgreSQL Enums for `OrderStatus`, `PaymentMethod`, `PaymentStatus`, and `Currency`, and enforced strict shipping address validation with legacy fallbacks.

### 4.2 The Snapshot Pricing Strategy (Critical Financial Design)

**Architectural Problem:** E-commerce catalogs frequently update product titles, SKUs, and retail prices. If an order references only a foreign key `product_id` and reads live prices from the catalog, modifying a product's price from ₹1,000 to ₹1,500 would corrupt historical orders, alter accounting ledgers, and break customer invoices.

**Enterprise Solution Implemented:**

* Inside `order_items`, the platform explicitly duplicates snapshot fields: `unit_price`, `subtotal`, `product_name`, and `product_sku`.

* When an order transitions to `PENDING` or `PROCESSING`, the domain service reads current values from the catalog and permanently snapshots them onto the `OrderItem` row inside the transaction.

* Even if a merchant deletes a product or alters prices, past financial records remain 100% immutable and audit-compliant.

## 5. Security Architecture, Authentication & RBAC

### 5.1 Dual-Token Lifecycle (Access & Refresh Flow)

```
[ Angular Client ]                      [ FastAPI Backend ]                 [ PostgreSQL / Redis ]
        │                                        │                                    │
        ├─── POST /api/v1/auth/login ───────────►│                                    │
        │    { email, password }                 ├── Verify Hash (bcrypt) ───────────►│
        │                                        │◄── Hash Valid, Fetch User/Role ────┤
        │                                        │                                    │
        │                                        ├── Generate JWT Access Token        │
        │                                        │   (Short-lived: 15-30 mins)        │
        │                                        ├── Generate Refresh Token           │
        │                                        │   (Long-lived: 7-30 days)          │
        │◄── 200 OK with Tokens ─────────────────┤                                    │
        │                                        │                                    │
        │                                        │                                    │
        ├─── GET /api/v1/orders (with JWT) ─────►│                                    │
        │    Authorization: Bearer <AccessJWT>   ├── Validate Signature & Expiry      │
        │                                        ├── Extract User UUID & Role         │
        │◄── 200 OK (Protected Data) ────────────┤                                    │
        │                                        │                                    │
        │                                        │                                    │
        │    [ Access Token Expires ]            │                                    │
        │                                        │                                    │
        ├─── POST /api/v1/auth/refresh ─────────►│                                    │
        │    { refresh_token }                   ├── Validate Refresh Token           │
        │                                        ├── Check Redis Revocation Store ───►│
        │◄── 200 OK with New Access Token ───────┤                                    │

```

### 5.2 RBAC Enforcement & Prevention of Cross-Tenant Data Leaks

* **Backend Enforcement:** Protected routes inject security dependencies:

  ```
  CurrentUser = Annotated[User, Depends(get_current_active_user)]
  AdminUser = Annotated[User, Depends(require_role("Admin"))]
  
  ```

* **Tenant Isolation Logic:** In customer endpoints (`/api/v1/orders`), the service layer automatically injects the authenticated `user_id` into repository query filters (`where(Order.user_id == current_user.id)`). Customers cannot guess or manipulate an `order_id` to inspect another user's invoice.

* **Frontend Interceptor Safeguard:** Angular's functional `authInterceptor` automatically attaches the active Bearer token to all outgoing `/api/v1/*` HTTP calls while explicitly ignoring public endpoints (`/auth/login`, `/auth/register`) to prevent unnecessary CORS preflight rejections.

## 6. Frontend Architecture (Angular 19 & Signals Paradigm)

### 6.1 Signals vs. RxJS BehaviorSubjects: Why Signals Win in Enterprise Storefronts

In traditional Angular architectures, application state relies on RxJS `BehaviorSubject` and `async` pipes. This introduces heavy boilerplate, subscription memory leak risks if unhandled, and coarse-grained change detection where entire component subtrees are re-evaluated.

```
Classic RxJS Approach:
[ Event ] ──► [ BehaviorSubject.next() ] ──► [ Zone.js Intercept ] ──► [ Global Dirty Check Tree ]

Angular 19 Signals Approach:
[ Event ] ──► [ Signal.set() / update() ] ──► [ Fine-Grained Reactive Node Notification ] (OnPush)

```

1. **Granular Reactivity:** Signals provide synchronous, glitch-free dependency tracking. When `cartItems()` signal changes, only the specific DOM nodes reading that signal update.

2. **Simplified Mental Model:** Computed signals (`computed(() => ... )`) automatically re-evaluate only when their exact input dependencies change, eliminating manual `distinctUntilChanged` piping.

3. **Zone.js Independence:** By pairing Signals with `ChangeDetectionStrategy.OnPush`, the platform drastically reduces CPU overhead during continuous DOM interactions.

### 6.2 Frontend Architecture Checklist & Design System Components

* **Layout Primitives:** `PageContainer`, `PageHeader`, `SectionHeader`.

* **Reusable Containers:** `AppCard` (supporting dynamic Light/Dark theme tokens).

* **Feedback & Resilience:** `LoadingSkeleton` (ensuring Zero Cumulative Layout Shift during network fetches), `EmptyState`, and `ErrorState`.

* **Global Actions & Modals:** `ConfirmationDialog` for order cancellations or stock adjustments.

## 7. Operational Runbook, Tooling & Verification Gates

### 7.1 Local Development Boot & Docker Compose Runbook

```
# 1. Clone repository and verify environment variables
git clone https://github.com/z4heer/ecommerce-platform.git
cd ecommerce-platform
cp .env.example .env

# 2. Spin up multi-container infrastructure
docker compose down -v
docker compose build --no-cache
docker compose up -d

# 3. Apply schema migrations
docker compose exec backend alembic upgrade head

# 4. Bootstrap master & demo dataset (30 Products, 3 Users, 8 Orders)
docker compose exec backend python -m scripts.bootstrap

# 5. Verify backend health
curl -f http://localhost:8000/health

```

### 7.2 Verification Gates & CI Execution

```
# Backend Quality Gate: Linting, Formatting, Typing, Tests
docker compose exec backend ruff check .
docker compose exec backend black --check .
docker compose exec backend mypy app
docker compose exec backend pytest --cov=app --cov-report=term-missing tests/

# Frontend Quality Gate: Production Build & Jasmine/Karma Test Suite
cd frontend/ecommerce-frontend
npm run build -- --configuration production
npm run test -- --watch=false --browsers=ChromeHeadless

```

## 8. Senior & Architect Interview Scenarios (Hinglish Q&A)

### Scenario 1: State Inconsistency & Race Conditions in Concurrent Checkout

**Interviewer:** *"Imagine multiple customers checkout the last item in stock simultaneously. How does your backend prevent overselling without crashing database performance?"*

**Your Answer (Hinglish):**
"Is problem ko solve karne ke liye hum teen primary layers par defensive engineering use karte hain:

1. **Pessimistic Locking / DB Row Locking (`SELECT ... FOR UPDATE`):**
   Jab checkout transaction trigger hota hai, toh checkout service repository ko bolti hai ki targeted inventory row par pessimistic lock acquire kare:

   ```
   stmt = select(Inventory).where(Inventory.product_id == p_id).with_for_update()
   inv = db.session.execute(stmt).scalar_one()
   
   ```

   Iska fayda ye hai ki jab tak transaction A complete ya rollback nahi hoti, transaction B wait karegi. Negative balance ka chance zero ho jata hai.

2. **PostgreSQL Check Constraint:**
   Application layer se alag, humare PostgreSQL relational schema par explicit database constraint laga hota hai: `CHECK (stock_quantity >= 0)`. Agar application code me koi race condition escape bhi ho jaye, toh database level par transaction instantly `IntegrityError` raise karegi aur roll back ho jayegi.

3. **Redis Distributed Lock (Future High-Scale Alternative):**
   Very high flash sale concurrency scenarios mein, Postgres DB connections ko lock wait se exhaust hone se bachane ke liye hum Redis lock (`Redlock` algorithm) evaluate karte hain, jahan checkout token issue hone se pehle stock memory level par decrement hota hai."

### Scenario 2: Modular Monolith vs. Microservices Trade-off

**Interviewer:** *"Why did you choose a Modular Monolith over Microservices for an enterprise e-commerce platform?"*

**Your Answer (Hinglish):**
"Ye decision maine **ADR-001** mein document kiya tha. Enterprise development mein premature microservices architectural disaster ban sakti hain.

* **Operational Complexity & Network Overhead:** Agar hum day one par Cart, Orders, Inventory, aur Auth ko alag microservices banate, toh hume distributed transactions handle karni padti (Two-Phase Commit ya Saga Pattern), network latency introduce hoti, aur observability ke liye distributed tracing (OpenTelemetry) manage karna padta.

* **Clean Architecture Monolith as Best of Both Worlds:** Humne Modular Monolith implement kiya jahan har domain (Orders, Products, Auth) completely decoupled module hai jisme strict layer separation hai (Routers, Services, Repositories). Dependency Injection ensure karti hai ki modules ek doosre ke database tables ko directly query na karein.

* **Future Migration Path:** Agar future mein Orders service ka scale 100x ho jata hai, toh Orders router, service, aur repository already isolated hain. Unhe extract karke standalone containerised microservice banana trivial ho jata hai without rewriting core business logic."

### Scenario 3: Dealing with Broken Migration Ledger Trees in Production

**Interviewer:** *"Alembic migrations crash ho gayi with `KeyError` upstream revision hash not found during staging deployment. How do you resolve this without data loss?"*

**Your Answer (Hinglish):**
"Ye exact real issue humne Sprint 4.6A mein resolve kiya tha jab migration script `d8a6f0b93c41` missing hash `9b2f4f6c7a81` point kar rahi thi.

1. **Root Cause Analysis:** Schema history linearize nahi thi. Branch merges ki wajah se down-revision pointer ek aise commit ko reference kar raha tha jo current production graph mein exist nahi karta tha.

2. **Resolution Strategy:**

   * Maine kabhi bhi production database ko drop ya blind reset nahi kiya.

   * `alembic history` command se actual linear graph identify kiya.

   * Script ke metadata header mein `down_revision` ko update karke foundational authentication hash (`400c87388bd6`) par point karwaya.

   * `alembic upgrade head` test container mein verify kiya, then rollback command `alembic downgrade -1` run karke clean idempotent down-up behavior ensure kiya.

3. **Engineering Standard:** Humne rule set kiya ki schema migration PRs ko merge karne se pehle CI pipeline mein fresh database boot karke full upgrade aur downgrade test pass karna mandatory hai."

### Scenario 4: Historical Financial Integrity via Snapshot Pricing

**Interviewer:** *"If an admin updates a product price from ₹5,000 to ₹3,000, what happens to existing orders, and how does your architecture ensure regulatory accounting compliance?"*

**Your Answer (Hinglish):**
"Humara architecture **Snapshot Pattern** strictly enforce karta hai:

* `OrderItems` table catalog `products` table par direct live price reference ke liye depend nahi karti.

* Jab order place hota hai, `OrderService` catalog se current price, product title, aur product SKU fetch karti hai aur unhe `OrderItem.unit_price`, `OrderItem.subtotal`, `OrderItem.product_name`, aur `OrderItem.product_sku` columns mein permanently write kar deti hai.

* Iska benefit ye hai ki chahe admin product ka price change kare, SKU update kare, ya product ko catalog se soft-delete kar de, historical orders par zero impact padta hai. Invoices aur financial reporting hamesha mathematically consistent aur audit-compliant rehti hain."

### Scenario 5: Angular 19 Signals & Preventing Memory Leaks

**Interviewer:** *"How did moving to Angular 19 Signals improve performance and reliability over traditional RxJS subscriptions?"*

**Your Answer (Hinglish):**
"Angular 19 Signals frontend architecture ko simplify aur optimize karte hain:

* **No Manual Subscription Management:** RxJS mein components ko `takeUntilDestroyed` ya manual `.unsubscribe()` use karna padta tha, warna detached views memory leak cause karte the. Signals synchronously read hote hain aur unka cleanup framework automatically handle karta hai.

* **Precise DOM Patching vs Heavy Dirty-Checking:** Zone.js pure component tree ko dirty mark karta tha. Signals ke sath, `ChangeDetectionStrategy.OnPush` use karte hue sirf wahi template node re-render hota hai jiska signal update hua hai (e.g., shopping cart badge total).

* **Computed Safety:** `computed(() => items().reduce(...))` lazily evaluate hota hai aur memoized rehta hai. Jab tak `items()` change nahi hoga, repeated calculations CPU burn nahi karengi."

## 9. Architectural Decision Records (ADR Master Index)

| ADR ID | Decision Title | Status | Primary Rationale & Architectural Trade-off | 
 | ----- | ----- | ----- | ----- | 
| **ADR-001** | Modular Monolith Architecture | **Approved** | Avoids distributed microservice network overhead & transaction complexity while retaining domain decoupling. | 
| **ADR-002** | Angular 19 + Standalone Components | **Approved** | Eliminates bloated NgModules; utilizes fast Vite bundling and native tree-shakable standalone imports. | 
| **ADR-003** | Fine-Grained Signals Reactive Store | **Approved** | Replaces complex RxJS BehaviorSubject boilerplate with predictable, synchronous, zero-leak state management. | 
| **ADR-004** | PostgreSQL 17 for Relational Core | **Approved** | ACID compliance, strict foreign key constraints, robust JSONB support, and native high-performance ENUM types. | 
| **ADR-005** | Redis 8 In-Memory Caching | **Approved** | Offloads catalog browsing, search queries, and session lookups from the primary relational database engine. | 
| **ADR-006** | JWT Access + Refresh Token RBAC | **Approved** | Stateless horizontally scalable authentication pairing short-lived access credentials with long-lived revocable refresh tokens. | 
| **ADR-007** | Snapshot Pricing Pattern | **Approved** | Duplicates financial data (`unit_price`, `subtotal`, `sku`) onto order items to guarantee immutable accounting integrity. | 
| **ADR-008** | Lightweight Vector SVG Asset Delivery | **Approved** | Replaces heavy image upload pipelines and cloud CDN expenses during MVP with self-contained, high-contrast, scalable vector assets. | 
| **ADR-009** | Repository Pattern with Strict Separation | **Approved** | Repositories exclusively execute persistence; service layers orchestrate business logic; routers remain thin DTO mappers. | 
| **ADR-010** | Linearized Alembic Schema Ledger | **Approved** | Enforces idempotent, bidirectional (`upgrade head` / `downgrade -1`) migration chains, preventing broken tree hash failures. | 

## 10. Glossary & System Metrics Summary

* **ACID:** Atomicity, Consistency, Isolation, Durability. Guaranteed by PostgreSQL 17 relational database transactions.

* **DTO (Data Transfer Object):** Strongly-typed Pydantic v2 schemas validating request inputs and defining exact HTTP JSON serialization contracts.

* **Idempotency:** The property where an operation can be applied multiple times without changing the result beyond the initial application (e.g., payment webhook ingestion).

* **OnPush Change Detection:** Angular optimization mode that skips dirty checking a component unless its `@Input` references change or bound Signals emit updates.

* **Pessimistic Locking:** Database lock acquired at row read time (`SELECT FOR UPDATE`) to prevent concurrent updates until the transaction commits.

* **RBAC (Role-Based Access Control):** Restricting application API endpoints and UI elements based on verified user claims (`Customer` vs. `Admin`).

* **SIT (System Integration Testing):** End-to-end automated testing validating that all decoupled system containers, network layers, and database sessions work in harmony.