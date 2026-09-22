# 02_Technical_Vocabulary_and_Core_Competency_Matrix.md

# Enterprise E-Commerce Platform: Technical Vocabulary aur Full-Lifecycle Competency Matrix

> **Document Classification:** Engineering Vocabulary, Core Competencies aur Full-Stack E-Commerce Skills
> **Target Audience:** Comeback Engineers, Senior Full-Stack Developers aur Technical Interviewees
> **Ecosystem:** FastAPI, Python 3.12, PostgreSQL 17, SQLAlchemy 2.x, Redis 7, Celery, Angular 19+ (Signals & Standalone)
> 
> 

---

## 1. Domain & Technical Vocabulary Dictionary (A to Z Terminology)

Neeche un specific keywords aur technical terms ki list di gayi hai jo Enterprise E-Commerce Platform ke pure lifecycle mein use hote hain:

### A

* **Address Serialization Contract:** Multi-field address form (Line 1, City, State, PIN) ko single structured string (`Flat 402, Pune, MH - 411045`) mein convert karna taaki logistics APIs aur courier partners ke sath standard payload contract maintain rahe.


* **Angular Signals:** Native reactive primitives (`signal()`, `computed()`, `effect()`) jo fine-grained reactivity provide karte hain aur Cart total recalculation ko microsecond execution dete hain bina pure component tree ko dirty-check kiye.


* **Atomic Transaction Boundary:** Checkout ke doran stock deduction, line item creation, aur master order insertion ko single `db.commit()` block ke andar rakhna taaki kisi bhi failure par `db.rollback()` ho aur koi orphan record na bache.



### C

* **Cart Drawer (Slide-Over):** Contextual shopping cart overlay jo Angular Signals se bound rehta hai; page navigate kiye bina items add, increment aur remove karne ki facility deta hai.


* **Cumulative Layout Shift (CLS):** Core Web Vital metric; catalog grid mein image load hote waqt UI jump na kare, iske liye loading skeletons aur fixed-aspect ratio SVG containers ka use kiya gaya hai.



### D

* **Deadlock Avoidance:** Multi-item orders checkout karte waqt product locks ko deterministic order (e.g., `ORDER BY product_id ASC`) mein lock karna taaki do concurrent transactions ek dusre ko block na karein (`HTTP 409 Conflict`).


* **DTO vs Entity Separation:** Presentation DTOs (Pydantic v2 schemas jo API responses ke liye serialize hote hain) aur Persistent Entities (SQLAlchemy attached models jo active database session mein modify hote hain) ke beech strict functional separation.


* **Dual-Token Silent Refresh:** Short-lived access token (15 mins) expire hone par Angular functional HTTP interceptor dwara silently `/auth/refresh` call karke naya token lana aur original API request ko bina user logout ke replay karna.



### F

* **Financial Snapshot Pricing Strategy:** Order place hote hi `order_items` table ke andar `unit_price`, `product_name`, aur `product_sku` ko freeze karna taaki future catalog price updates se historical invoices aur accounting ledgers corrupt na hon.


* **Flash Sale Concurrency:** High-concurrency spike scenario jisme hazaron users limited inventory units (e.g., 5 items) ko ek hi second mein checkout karne ki koshish karte hain.



### I

* **IDOR (Insecure Direct Object Reference) Protection:** Customer A dwara URL mein Customer B ka `order_id` inject karke access karne par repository layer dwara `WHERE user_id = :current_user_id` enforce karke `HTTP 404 Not Found` return karna.


* **Immutable Order Item:** Relational mapping (`order_items`) jisme order placement ke baad modifications disallowed hoti hain; audit trails aur tax reporting ke liye data freeze rehta hai.



### L

* **Ledger Precision (`Numeric(12, 2)` / `Decimal`):** Currency math ke liye binary `float` ko strictly ban karke Python ke `Decimal` aur Postgres ke `Numeric(12, 2)` ko use karna taaki floating-point rounding drifts eliminate hon.



### N

* **N+1 Query Elimination:** Relational database associations (Orders $\rightarrow$ OrderItems, Orders $\rightarrow$ Users) load karte waqt SQLAlchemy `joinedload()` use karna taaki single SQL query mein joined data fetch ho aur database connection pool choke na ho.



### O

* **Overselling (Negative Stock Bug):** Concurrency race condition jisme do simultaneous requests remaining stock check pass kar leti hain aur stock -1 ya -2 ho jata hai.



### P

* **Pessimistic Row Locking (`SELECT ... FOR UPDATE`):** Checkout ke doran specific product inventory row par database-level exclusive lock lagana, jisse doosra transaction tab tak wait kare jab tak active checkout commit ya rollback na ho jaye.


* **Postal PIN Code Pattern (`/^[1-9][0-9]{5}$/`):** 6-digit Indian postal code validation regex jo invalid pin codes ko client-side form level par hi block kar deta hai.



### R

* **Razorpay / Stripe Webhook Idempotency:** Payment gateway notifications ko double-process hone se bachane ke liye gateway payment ID ko Redis key lock ke sath verify karna.


* **RBAC Route Guards:** Angular router guards (`AuthGuard`, `RoleGuard`) jo normal customers ko `/admin/*` routes se block karte hain aur unauthenticated requests ko `/login` par route karte hain.



### S

* **Static SVG Asset Pipeline:** Vector images (`/static/product_images/<slug>.svg`) ko clean CDN URL structure se serve karna taaki crisp high-DPI rendering mile aur bandwidth consume na ho.


* **Stock Allocation State Machine:** Stock ka status transition: `AVAILABLE` $\rightarrow$ `RESERVED` (during checkout lock) $\rightarrow$ `DEDUCTED` (on payment success) $\rightarrow$ `RESTORED` (on cancellation).



---

## 2. Full-Lifecycle Engineering Competency Matrix

Yeh matrix Enterprise E-Commerce Platform ke conceptual design se lekar production monitoring tak ke complete lifecycle skills ko cover karti hai:

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Architecture, Data Modeling & Concurrency     │
│ - Clean Architecture, DTO/Entity Boundaries, Row Locks │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 2: High-Throughput Backend & Storage Engines     │
│ - FastAPI Async, SQLAlchemy 2.x, PostgreSQL 17 Numeric │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 3: Modern Reactive Frontend (Angular 19+)        │
│ - Signals Cart Store, OnPush, Reactive Address Forms   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 4: Quality Assurance, Automated SIT & Security   │
│ - Pytest Concurrency Tests, Postman SIT, IDOR Defense  │
└────────────────────────────────────────────────────────┘

```

---

### Phase A: Architecture, Data Modeling & Concurrency Strategy

* **High-Concurrency Data Design:** Concurrency-proof tables design karna jisme inventory mutation aur order placement ke beech deadlocks aur race conditions create na hon.


* **Financial Ledger Immutability:** Product catalog table aur historical orders ke beech decoupled snapshot relationship architect karna.


* **Layer Responsibility Isolation:** Routing layer, Business Logic (Services), aur Data Persistence (Repositories) ke beech strict encapsulation enforce karna.



### Phase B: Backend API & Transaction Engineering (FastAPI / PostgreSQL 17)

* **Pessimistic Locking Implementation:** SQLAlchemy 2.x async/sync syntax mein `.with_for_update()` use karke critical inventory rows ko atomic transaction ke doran lock karna.


* **Pydantic v2 Contract Validation:** Strict typing schemas banana jo negative quantities, invalid payment enums, aur malformed JSON bodies ko `HTTP 422 Unprocessable Entity` ke sath intercept karein.


* **Connection Pooling Governance:** High staging throughput ke liye `create_engine` parameters configure karna (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`).



### Phase C: Modern Frontend Engineering (Angular 19+ Standalone & Signals)

* **Signal-Driven State Architecture:** `CartService` ko bina external store (NgRx) ke pure Angular Signals (`signal()`, `computed()`) par architect karna taaki items add/remove hone par micro-level state update ho.


* **Change Detection Optimization (`OnPush`):** Har UI component par `ChangeDetectionStrategy.OnPush` enforce karke default zone dirty-checking ko bypass karna.


* **Defensive Form Engineering:** Complex checkout address forms ko custom regex validators (`Validators.pattern(/^[1-9][0-9]{5}$/)`) ke sath guard karna.


* **Silent Auth Chaining:** Angular functional interceptor banana jo 401 status aane par refresh token se session revive karke user journey disrupt na hone de.



### Phase D: Quality Engineering, SIT Automation & Penetration Defense

* **Automated Regression Postman SIT:** Token chaining ke sath end-to-end regression collection run karna (Auth $\rightarrow$ Catalog $\rightarrow$ Orders $\rightarrow$ Admin KPIs).


* **IDOR & RBAC Security Testing:** Customer token ke sath admin endpoints aur dusre customers ke `order_id` access attempt karke `403 Forbidden` aur `404 Not Found` verify karna.


* **Negative Stock Boundary Testing:** Low stock scenario mein concurrent cURL scripts chala kar `HTTP 400 Bad Request` ("Insufficient stock") ka assertion karna.
