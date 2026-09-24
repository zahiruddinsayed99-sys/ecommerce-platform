# Functional to Technical Map

| Functional Feature | Technical Module / Controller | Database Models | Frontend View / Component |
| :--- | :--- | :--- | :--- |
| **User Registration/Login** | `auth_router.py` -> `auth_service.py` | `User`, `Role` | `login.component.ts`, `register.component.ts` |
| **Catalog Browsing** | `product_router.py` (`get_products`) | `Product`, `Category`, `Inventory` | `product-list.component.ts`, `product-detail.component.ts` |
| **Cart Management** | Client-Side State Management | N/A (Local/Session Storage) | `cart.component.ts` |
| **Checkout & Order Creation**| `order_router.py` (`create_user_order`) | `Order`, `OrderItem`, `Inventory` | `checkout.component.ts` |
| **Payment Processing** | `order_router.py` (`confirm_payment`) | `Order` (updates status) | Razorpay Overlay -> `checkout.component.ts` |
| **Order History** | `order_router.py` (`get_user_orders`) | `Order`, `OrderItem` | `profile-dashboard.component.ts`, `order-details.component.ts` |
| **Admin Dashboard KPIs** | `dashboard_router.py` (`get_admin_dashboard`)| `Order`, `Product` (Aggregations) | `dashboard.component.ts` |
| **Admin Order Management** | `admin_order_router.py` (`admin_update_order`)| `Order` | `admin-orders.component.ts` |
