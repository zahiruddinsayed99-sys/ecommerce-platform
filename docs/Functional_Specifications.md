# Functional Specifications

## Overview
The Enterprise E-Commerce Platform provides a comprehensive suite of features supporting both customer-facing storefront operations and back-office administration workflows.

## Customer Workflows

### 1. Browse and Search
*   **Product Discovery:** Customers can browse a catalog of products categorized logically.
*   **Search and Filter:** Advanced search functionalities allow customers to find products by name, category, and price range.
*   **Product Details:** Customers can view detailed product pages including high-quality images, descriptions, pricing, and availability.

### 2. Cart Management
*   **Add to Cart:** Customers can add products to their shopping cart and specify quantities.
*   **Review Cart:** A dedicated cart view allows customers to review added items, update quantities, and view real-time subtotal calculations.
*   **Remove Items:** Customers can remove items from their cart seamlessly.

### 3. Checkout Flow
*   **Secure Checkout:** Customers initiate a secure checkout process.
*   **Shipping Information:** Customers input and validate shipping details.
*   **Payment Integration:** Integration with Razorpay for secure and reliable payment processing (supports Cards, UPI, NetBanking).
*   **Order Confirmation:** Upon successful payment, an order confirmation with an order number is generated.

### 4. Order History
*   **View Orders:** Customers have a dedicated profile section to view historical orders.
*   **Order Details:** Customers can view detailed breakdowns of past orders, including itemized lists, pricing snapshots, and shipping status (e.g., Pending, Processing, Shipped, Delivered).

## Admin / Merchant Dashboards

### 1. Dashboard Metrics
*   **Key Performance Indicators (KPIs):** Admins can view aggregated metrics such as total revenue, active product counts, and recent order status distributions.
*   **Live Backend Aggregations:** Real-time data fetched directly from PostgreSQL.

### 2. Product Catalog Management
*   **CRUD Operations:** Full capabilities to create, read, update, and delete (soft/hard) product listings.
*   **Inventory Tracking:** Management of stock levels, including reserved quantities during active checkouts.

### 3. Order Management
*   **Order Lifecycle Management:** Admins can view all platform orders and transition statuses (e.g., Pending -> Confirmed -> Shipped).
*   **Detailed Order Profiles:** Access to comprehensive data per order, including shipping addresses and payment references.

---

## Role-Wise Process Flow

### Customer
1.  Registers or Logs in.
2.  Browses catalog or searches for specific items.
3.  Adds items to Cart.
4.  Proceeds to Checkout.
5.  Provides shipping address and selects payment method.
6.  Completes payment via Razorpay.
7.  Receives order confirmation.
8.  Tracks order status via Order History.

### Merchant / Administrator
1.  Logs in to the Admin Portal.
2.  Views dashboard for quick metrics.
3.  Manages Catalog (Adds new products, updates stock).
4.  Monitors Incoming Orders.
5.  Updates Order Status (e.g., marking an order as 'SHIPPED').
6.  Reviews low stock and sales reports.

### Payment Gateway System (Razorpay)
1.  Receives checkout session initiation from backend.
2.  Processes customer payment details securely.
3.  Returns success/failure tokens to frontend.
4.  Triggers backend webhook/confirmation endpoint to update payment status and inventory.
