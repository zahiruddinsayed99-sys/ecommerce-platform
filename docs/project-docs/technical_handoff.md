# Enterprise E-Commerce Platform - Technical Handoff Document

This document provides a technical and code implementation handoff for the Enterprise E-Commerce Platform. It covers the system architecture, codebase structure, key design patterns, and instructions for local development and testing.

## 1. System Architecture

The platform follows a standard client-server architecture, decoupled into a frontend Single Page Application (SPA) and a backend RESTful API.

*   **Frontend**: Angular 19 (Standalone Components, Reactive Forms, custom Design System).
*   **Backend**: FastAPI (Python 3.11+).
*   **Database**: PostgreSQL with `pgvector` for advanced querying, accessed via SQLAlchemy 2.x ORM.
*   **Caching & Queue**: Redis (used for caching and Celery message broker).
*   **Background Tasks**: Celery (intended for asynchronous task processing like email notifications).
*   **Payments**: Razorpay integration for end-to-end checkout processing.

## 2. Codebase Structure

The repository is organized into two primary applications:

```text
├── backend/                  # FastAPI Application
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # Main application code
│   │   ├── core/             # Configuration, security, and global settings
│   │   ├── database/         # DB connection and session management
│   │   ├── modules/          # Domain-driven modules (e.g., auth, products, orders)
│   │   │   └── {domain}/     # Contains routers, schemas, models, services
│   │   └── main.py           # FastAPI application entry point
│   ├── tests/                # PyTest suite for backend logic
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Angular Application
│   └── ecommerce-frontend/
│       ├── src/
│       │   ├── app/          # Angular components, services, and routing
│       │   ├── assets/       # Static assets (images, styles)
│       │   └── environments/ # Environment-specific configurations
│       ├── package.json      # Node dependencies and build scripts
│       └── angular.json      # Angular workspace configuration
│
├── docs/                     # Project documentation (ADRs, system design, deployment guides)
└── docker-compose.yml        # Local development environment setup
```

## 3. Key Design Patterns & Technical Decisions

### Backend Design Patterns
*   **Domain-Driven Structure**: The `backend/app/modules/` directory groups code by feature (e.g., Auth, Products, Orders). Each module contains its own routes, Pydantic schemas, SQLAlchemy models, and service classes.
*   **Repository Pattern**: Data access is abstracted behind repositories to keep controllers thin and focused on HTTP layer concerns.
*   **Service Layer**: Business logic resides strictly in service classes to ensure reusability and testability.
*   **Dependency Injection**: FastAPI's `Depends` system is extensively used to inject database sessions, configuration, and services into route handlers.
*   **Historical Data Integrity**: The platform uses a Snapshot Strategy. Product details (name, SKU, price) are copied into `order_items` at purchase to preserve historical accuracy even if the product catalog changes later.

### Frontend Design Patterns
*   **Standalone Components**: The Angular app leverages Standalone Components for better modularity and tree-shaking, removing the need for `NgModules`.
*   **Reactive Forms**: Complex form handling (e.g., checkout and user registration) is managed via Angular Reactive Forms.
*   **Role-Based Access Control (RBAC)**: Route guards protect admin-only views. Note: Role strings are case-sensitive and typically handled in uppercase (e.g., `ADMIN`).
*   **State Management**: Standard RxJS observables and services are used for managing application state (e.g., Shopping Cart state).

## 4. Local Development Setup

The project uses Docker to ensure a consistent local development environment that mirrors production.

### Prerequisites
*   Docker & Docker Compose
*   Node.js & npm (for frontend-specific commands)
*   Python 3.11+ (for backend-specific commands)

### Running the Stack Locally
1.  **Clone the repository**: `git clone <repository_url>`
2.  **Start Docker Compose**:
    ```bash
    docker-compose up --build
    ```
    This command will spin up the Postgres database, Redis cache, FastAPI backend, and Angular frontend. On the first run, the system will automatically execute Alembic migrations and seed the database with initial products and an admin user.

### Backend Development Commands
*   **Run Tests**:
    ```bash
    cd backend
    PYTHONPATH=. python -m pytest tests
    ```
*   **Generate Migration**:
    ```bash
    cd backend
    alembic revision --autogenerate -m "description of change"
    ```
*   **Apply Migrations**:
    ```bash
    cd backend
    alembic upgrade head
    ```

### Frontend Development Commands
*   **Install Dependencies**:
    ```bash
    cd frontend/ecommerce-frontend
    npm install
    ```
*   **Start Local Server** (if running outside Docker):
    ```bash
    npx ng serve
    ```
*   **Run Tests**:
    ```bash
    npm test -- --watch=false
    ```
*   **Build for Production**:
    ```bash
    npm run build
    ```
    *Build output goes to `dist/ecommerce-frontend` as configured in `angular.json`.*

## 5. Security & Configuration
*   **Environment Variables**: The backend configuration is driven by `BaseSettings` from `pydantic-settings` (see `backend/app/core/config.py`). Secrets like `POSTGRES_PASSWORD`, `RAZORPAY_KEY_SECRET`, and JWT signing keys should never be hardcoded.
*   **CORS**: Configured in FastAPI `main.py` to allow requests from the Angular frontend origin.
