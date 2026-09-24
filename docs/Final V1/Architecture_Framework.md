# Architecture Framework

## System Overview
The Enterprise E-Commerce platform follows a strict N-Tier architecture, emphasizing separation of concerns between the presentation layer (Angular) and the business logic/data layer (FastAPI/PostgreSQL).

## Frontend Architecture (Angular 19)
*   **Component-Based UI:** Utilizing Angular Material and customized SCSS for a responsive design system.
*   **State Management:** Leveraging Angular Signals and RxJS for reactive state handling across Cart, User Session, and UI Themes.
*   **Routing & Guards:** Implementing Route Guards to enforce RBAC directly in the browser (redirecting unauthorized users).
*   **Interceptors:** HTTP interceptors for transparently attaching JWT tokens and global error/loading state management.

## Backend Architecture (FastAPI)
*   **Repository Pattern:** Abstracts raw SQLAlchemy queries away from business logic. Services rely on Repositories to fetch/mutate data.
*   **Service Layer:** Contains core business logic (e.g., verifying stock before checkout, calculating totals).
*   **Controllers (Routers):** Thin routing layers responsible solely for HTTP request parsing, dependency injection, and standardizing HTTP responses.
*   **Dependency Injection:** Extensively used for database sessions (`get_db`) and authentication constraints.

## Scalability Considerations
*   **Stateless APIs:** The FastAPI application is entirely stateless. JWT is used for session persistence, enabling horizontal scaling behind a load balancer.
*   **Caching Strategy:** Redis is provisioned for caching expensive dashboard queries and rate-limiting potential attack vectors.
*   **Database Connection Pooling:** SQLAlchemy is configured with connection pooling to handle high concurrency seamlessly.

## Data Security Mechanisms
*   **Password Hashing:** `bcrypt` is utilized via `passlib` to secure user credentials.
*   **Snapshot Strategy:** Orders duplicate product pricing and naming into `order_items` at the time of purchase, preventing historical invoice corruption when catalog prices change.
*   **Concurrency Control:** Inventory deduction relies on Row-Level Locking (`with_for_update()`) to prevent race conditions during simultaneous checkouts.
*   **CORS & Environment Separation:** Strict origins and environment variables prevent sensitive config leaks.
