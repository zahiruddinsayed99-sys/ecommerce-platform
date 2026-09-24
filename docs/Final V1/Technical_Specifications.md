# Technical Specifications

## Database Architecture & ERD Summary

The platform uses PostgreSQL with SQLAlchemy 2.x as the ORM.

### Core Tables & Models
*   **users:** `id` (UUID), `email`, `password_hash`, `role_id`
*   **roles:** `id` (UUID), `name` (e.g., ADMIN, CUSTOMER)
*   **products:** `id` (UUID), `name`, `description`, `category_id`, `sku`, `price`, `image_url`, `is_active`
*   **categories:** `id` (UUID), `name`, `slug`, `description`
*   **inventory:** `id` (UUID), `product_id`, `stock_quantity`, `reserved_quantity`
*   **orders:** `id` (UUID), `user_id`, `total_amount`, `status`, `shipping_address`, `order_number`, `payment_method`, `payment_status`, `payment_reference`, `payment_date`, `currency`
*   **order_items:** `id` (UUID), `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`, `product_name`, `product_sku` (Implements a snapshot strategy for historical pricing/naming).

## API Endpoint Architecture

Built using FastAPI, the API is organized into modular routers:
*   `/api/v1/auth`: Authentication and user registration (JWT based).
*   `/api/v1/products`: Product catalog operations (GET for all, POST/PUT/DELETE protected by admin).
*   `/api/v1/orders`: Order creation, checkout sessions, payment confirmations, and history.
*   `/api/v1/admin/orders`: Privileged administrative order lifecycle management.
*   `/api/v1/admin/dashboard`: Aggregated dashboard metrics.

## Middleware & Security
*   **CORS Middleware:** Configured globally in `main.py` allowing cross-origin requests from the frontend.
*   **Authentication Dependencies:** `require_admin` and `require_customer` injectables enforce Role-Based Access Control (RBAC).
*   **Exception Handlers:** A centralized exception handling registry (`register_exception_handlers`) intercepts known exceptions (e.g., HTTP 400, 404, 500) and serializes structured JSON error responses.

## Third-Party Integrations
*   **Razorpay:** Integrated for payment processing.
    *   Backend generates a checkout session token.
    *   Frontend invokes Razorpay UI.
    *   Backend validates payment signatures and confirms the transaction via `/confirm-payment`.

## Error Handling Strategies
*   **Validation Errors:** Handled natively via Pydantic schemas, returning 422 Unprocessable Entity with exact field markers.
*   **Business Logic Errors:** Services raise `ValueError`, intercepted by routers to return a 400 Bad Request with a clear message.
*   **Resource Not Found:** Standardized 404 HTTP exceptions for missing database entities.
*   **Database Rollbacks:** Order creation and inventory deduction are wrapped in ACID transactions. Failures trigger safe rollbacks preventing dirty reads/writes.
