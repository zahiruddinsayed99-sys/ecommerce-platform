# Enterprise E-Commerce Platform — Master Reference & Interview Guide

*Enterprise Storefront & Back-Office Administration Platform: Architecture, Specs, and Operations*

## Document Index & Purpose

Use this index as your roadmap to navigate and review the underlying documentation files for this platform:

1. **`API_DOCUMENTATION_2.md`**

* **Purpose:** Detailed API reference for authentication, product catalog, customer orders, payment sessions, and admin dashboard endpoints.


2. **`Architecture_Framework_2.md`**

* **Purpose:** Outlines the strict N-Tier architecture, separation of concerns (Repository Pattern, Service Layer, Controllers), frontend signals/state management, and security mechanisms.


3. **`developers-cheatsheet.md`**

* **Purpose:** Practical developer guide for local environment setup, Alembic database migrations/seeding, routine workflows, and QA checklists.


4. **`Functional_Specifications_2.md`**

* **Purpose:** Detailed functional requirements for customer shopping/checkout journeys, merchant dashboards, and step-by-step role-wise process flows.


5. **`Functional_Technical_Map_2.md`**

* **Purpose:** A cross-reference matrix mapping functional features directly to technical backend modules, database models, and frontend Angular components.


6. **`RUNBOOK_2.md`**

* **Purpose:** Day-2 operations guide covering Docker deployment, PostgreSQL backups (`pg_dump`), cache clearing (`FLUSHALL`), scaling, and production crash log troubleshooting.


7. **`Technical_Specifications_2.md`**

* **Purpose:** In-depth breakdown of the database schema (ERD summary with snapshot pricing), middleware configurations, Razorpay integration, and ACID error handling strategies.



---

## 1. Executive Summary & Tech Stack

The Enterprise E-Commerce Platform is a robust, full-stack shopping and administrative solution designed to provide seamless customer catalog browsing, secure Razorpay checkout flows, inventory management, and deep merchant analytics.

* **Frontend:** Angular 19 (Material UI, Signals, RxJS state management) deployed on **Vercel**.


* **Backend API:** FastAPI / Python (Modular routers, dependency injection, service/repository patterns) deployed on **Render**.


* **Database & Migrations:** Supabase PostgreSQL 2.x managed via **Alembic**.


* **Caching & Broker:** Redis (handling dashboard caching, query performance, and rate-limiting with graceful fallbacks).


* **Payment Gateway:** **Razorpay** integration supporting Cards, UPI, and NetBanking.



---

## 2. Core Functional Modules

* **Catalog Discovery & Search:** Browsing structured categories, filters by price/name, and detailed product specifications.


* **Cart Management:** Real-time quantity adjustments, subtotal calculations, and item removals.


* **Secure Checkout & Payments:** End-to-end checkout flow integrated with Razorpay, handling signature validation and payment confirmation.


* **Customer Order History:** Itemized breakdown of past orders and live tracking status (`Pending`, `Processing`, `Shipped`, `Delivered`).


* **Merchant & Admin Dashboard:** Real-time KPI visibility (total revenue, product counts), inventory tracking, and complete order lifecycle management.



---

## 3. System Architecture & Data Flow

```
[ Angular 19 SPA (Vercel) ] -- HTTPS / REST --> [ FastAPI Backend (Render) ]
                                                        |
                       +--------------------------------+--------------------------------+
                       | (Repository Pattern & Services)                                 | (Async Redis)
                       v                                                                 v
         [ Supabase PostgreSQL 16 ]                                                [ Redis Cache ]

```

### Key Technical Implementation Strategies:

* **Snapshot Pricing Strategy:** Orders duplicate product pricing and naming into `order_items` at checkout time to prevent historical invoice corruption if catalog prices change later.


* **Concurrency Control:** Inventory deduction relies on Row-Level Locking (`with_for_update()`) inside ACID-compliant transactions to prevent race conditions during simultaneous checkouts.


* **Repository Pattern:** Raw SQLAlchemy queries are abstracted away from business logic into dedicated repositories.



---

## 4. Role-Wise Process Flows

* **Customer:** Registers/logs in, browses products, adds items to cart, checks out via Razorpay, receives confirmation, and tracks order history.


* **Merchant / Administrator:** Logs into the admin portal, reviews KPI dashboard metrics, updates product catalogs and stock levels, and transitions active order statuses (e.g., marking orders as `SHIPPED`).


* **Payment Gateway System (Razorpay):** Receives checkout session creation tokens, processes customer payment details securely, and triggers backend webhook/confirmation endpoints to finalize order state and inventory reduction.



---

## 5. Operations Runbook & Maintenance (Day-2)

* **Production Deployment:** Managed via Docker Compose (`docker-compose -f docker-compose.prod.yml up -d --build`).


* **Database Backups:** Daily automated or manual backups using `pg_dump`:
```bash
docker exec -t ecommerce-postgres pg_dump -U ecommerce_user -F c ecommerce_db > backup_$(date +%Y%m%d).dump
```[cite: 17]

```


* **Cache Management:** Use `redis-cli` and `FLUSHALL` if stale dashboard data is observed.


* **Troubleshooting:** Inspect backend logs using `docker logs ecommerce-backend --tail 100 -f` to isolate 500 errors or database connection timeouts.



---

## 6. API Reference Quick-Glance

* **Authentication:** `POST /api/v1/auth/login` (Returns JWT access token).


* **Product Catalog:** `GET /api/v1/products` (Paginated product discovery with query filters).


* **Order Processing:**
* `POST /api/v1/orders/` (Creates pending order and reserves stock).


* `POST /api/v1/orders/{order_id}/checkout-session` (Generates payment gateway token).


* `POST /api/v1/orders/{order_id}/confirm-payment` (Validates signature and transitions order to processing).




* **Admin Controls:** `PATCH /api/v1/admin/orders/{order_id}/status` and `GET /api/v1/admin/dashboard`.



---