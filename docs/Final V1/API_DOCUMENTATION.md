# API Reference

## Global Headers
*   `Authorization`: `Bearer <JWT_TOKEN>` (Required for all endpoints except Auth and public Catalog queries).

## Authentication (`/api/v1/auth`)

### POST `/login`
*   **Description:** Authenticates user and returns JWT.
*   **Request Body:** `AuthRequest` (email, password)
*   **Response (200):** `{ "access_token": "string", "token_type": "bearer" }`
*   **Errors:** `401 Unauthorized`

## Catalog (`/api/v1/products`)

### GET `/`
*   **Description:** Retrieves a paginated list of active products.
*   **Query Params:** `category`, `search`, `min_price`, `max_price`, `page`, `size`
*   **Response (200):** `[ ProductResponse, ... ]`

### POST `/` (Admin Only)
*   **Description:** Creates a new product.
*   **Request Body:** `ProductCreate` (name, price, stock_quantity, category, etc.)
*   **Response (201):** `ProductResponse`

## Orders (`/api/v1/orders`)

### POST `/`
*   **Description:** Creates a pending order and reserves inventory.
*   **Request Body:** `CreateOrderRequest` (items[], shipping_address, payment_method)
*   **Response (201):** `OrderResponse`
*   **Errors:** `400 Bad Request` (Insufficient Stock)

### POST `/{order_id}/checkout-session`
*   **Description:** Generates a payment gateway session token.
*   **Response (200):** `{ "token": "string" }`

### POST `/{order_id}/confirm-payment`
*   **Description:** Validates payment and updates order to PROCESSING.
*   **Request Body:** `ConfirmPaymentRequest` (payment_id, signature)
*   **Response (200):** `OrderResponse`

## Admin Orders (`/api/v1/admin/orders`)

### PATCH `/{order_id}/status`
*   **Description:** Updates the lifecycle state of an order.
*   **Request Body:** `OrderStatusUpdateRequest` (status: 'SHIPPED', 'DELIVERED', etc.)
*   **Response (200):** `OrderDetailResponse`

## Admin Dashboard (`/api/v1/admin/dashboard`)

### GET `/`
*   **Description:** Aggregates total revenue, user count, and order statistics.
*   **Response (200):** `DashboardResponse`
