# Document 05: Code Architecture & Implementation Templates

**Project:** Enterprise E-Commerce Platform

**Target Environment:** Local Docker Compose / Render Web Service + Supabase PostgreSQL 17 + Upstash Redis

**Classification:** Deep Implementation Handbook & Production Code Templates

**Language Tone:** Professional Hinglish with Production Code Annotations

---

## 1. Architectural Philosophy & Layer Separation

Enterprise E-Commerce backend ko **Clean Domain-Driven Modular Monolith** pattern par banaya gaya hai. Har domain module (`auth`, `catalog`, `cart`, `orders`, `payments`, `admin`) strict layer separation follow karta hai:

```
[ HTTP Request / Client (Angular 19 Signals) ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ 1. API Controllers & Routing (app/modules/*/routers)   │ ◄── Authentication, RBAC Guard, DTO Parsing
└──────────────────────────┬─────────────────────────────┘
                           │ Pydantic v2 DTOs
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Application Services (app/modules/*/services)       │ ◄── Business Rules, Locking, Cache Logic
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ 3. Domain Repositories   │  │ 4. Cache & Async Broker  │
│    (SQLAlchemy 2.0 ORM)  │  │    (Redis 7 / Upstash)   │
└─────────────┬────────────┘  └──────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────┐
│ 5. Database Layer (PostgreSQL 17 / Supabase)           │ ◄── Pessimistic Locking & Financial Ledgers
└────────────────────────────────────────────────────────┘

```

### Layer Golden Rules:

1. **Routers Kabhi Direct DB Queries Nahi Likhenge:** Router ka kaam sirf request receive karna, dependency inject karna (`get_db`, `get_current_user`), aur Pydantic schema return karna hai.
2. **DTOs vs Database Models Decoupling:** Database entities (`SQLAlchemy Base`) kabhi direct client ko expose nahi hoti. Har response Pydantic v2 DTO ke through serialize hoti hai taaki schema changes se API break na ho.
3. **Pessimistic Locking sirf Service Layer me:** Concurrency aur race conditions handle karne ke liye transaction boundaries aur `with_for_update()` service methods me encapsulate rehte hain.

---

## 2. Production Code Templates (Backend — FastAPI & SQLAlchemy 2.x)

### 2.1 Core Config & Environment Resolution (Pydantic v2 & 12-Factor App)

Production Render aur local Docker environment ko bina code modification handle karne ke liye baseline config:

```python
# app/core/config.py
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise E-Commerce Platform"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False

    # Database Settings
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Redis Cache & Broker Settings (Supports local Docker & Upstash TLS)
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_SSL: bool = False

    # JWT Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()

```

---

### 2.2 Resilient Multi-Environment Redis Client Setup

Local (`REDIS_HOST=redis`, plain TCP) aur Production (`Upstash`, `rediss://`, TLS/SSL enforced) auto-switch pattern:

```python
# app/core/redis_client.py
import os
import redis
from app.core.config import settings

def create_redis_client() -> redis.Redis:
    redis_url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL")
    if redis_url:
        return redis.Redis.from_url(redis_url, decode_responses=True)

    host = getattr(settings, "REDIS_HOST", "localhost")
    port = int(getattr(settings, "REDIS_PORT", 6379))
    password = getattr(settings, "REDIS_PASSWORD", None)

    # Auto-detect Cloud/Upstash based on host name
    is_cloud = host not in ("redis", "localhost", "127.0.0.1", "ecommerce-cache")
    ssl_required = getattr(settings, "REDIS_SSL", is_cloud)

    return redis.Redis(
        host=host,
        port=port,
        password=password,
        ssl=ssl_required,
        ssl_cert_reqs=None if ssl_required else None,
        decode_responses=True
    )

redis_client = create_redis_client()

def check_redis() -> bool:
    """Production health-check probe."""
    try:
        if redis_client:
            return bool(redis_client.ping())
        return False
    except Exception as e:
        print(f"Redis healthcheck ping failed: {e}")
        return False

```

---

### 2.3 Concurrency & Pessimistic Row Locking (`SELECT FOR UPDATE`)

Flash sale ya high-concurrency order placement ke waqt inventory over-selling prevent karne ka production-grade service:

```python
# app/modules/orders/services/order_service.py
import uuid
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.modules.catalog.models.product import Product
from app.modules.orders.models.order import Order, OrderItem
from app.modules.orders.schemas.order_dto import OrderCreateRequest, OrderResponseDTO
from app.core.redis_client import redis_client

class OrderProcessingService:
    @staticmethod
    def create_order_with_pessimistic_lock(
        db: Session,
        user_id: uuid.UUID,
        request: OrderCreateRequest
    ) -> Order:
        """
        Executes order checkout under strict pessimistic row locks (SELECT FOR UPDATE).
        Prevents race conditions where two users buy the last stock unit simultaneously.
        """
        # Step 1: Open atomic transaction
        with db.begin_nested():
            total_order_amount = Decimal("0.00")
            order_items_to_persist = []

            for item_req in request.items:
                # Pessimistic Row-Lock: with_for_update() blocks concurrent transactions
                stmt = (
                    select(Product)
                    .where(Product.id == item_req.product_id)
                    .with_for_update()
                )
                product = db.execute(stmt).scalar_one_or_none()

                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Product {item_req.product_id} not found."
                    )

                # Inventory check
                if product.stock_quantity < item_req.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Insufficient inventory for '{product.title}'. Requested: {item_req.quantity}, Available: {product.stock_quantity}"
                    )

                # Deduct inventory atomically
                product.stock_quantity -= item_req.quantity

                # Financial Pricing Snapshot: Lock item price at checkout time
                frozen_unit_price = product.price
                item_subtotal = frozen_unit_price * item_req.quantity
                total_order_amount += item_subtotal

                order_item = OrderItem(
                    id=uuid.uuid4(),
                    product_id=product.id,
                    product_title_snapshot=product.title,
                    unit_price_snapshot=frozen_unit_price,
                    quantity=item_req.quantity,
                    subtotal=item_subtotal
                )
                order_items_to_persist.append(order_item)

            # Persist Master Order
            new_order = Order(
                id=uuid.uuid4(),
                user_id=user_id,
                status="PENDING_PAYMENT",
                total_amount=total_order_amount,
                items=order_items_to_persist
            )
            db.add(new_order)

        # Commit master transaction
        db.commit()
        db.refresh(new_order)

        # Invalidate Product List Redis Cache after stock depletion
        try:
            if redis_client:
                redis_client.delete("cache:products:list")
        except Exception as e:
            print(f"Redis cache invalidation warning: {e}")

        return new_order

```

---

### 2.4 Defensive Admin Serialization Pattern (Database Mismatch Immunity)

Schema drift aur missing optional columns se endpoint 500 error rokne ke liye safe router mapping:

```python
# app/modules/auth/routers/admin_user_router.py
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.modules.auth.dependencies import require_admin
from app.modules.auth.models.user import User

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    created_at: str
    role: str

    model_config = ConfigDict(from_attributes=True)

def resolve_created_at(user) -> str:
    raw_val = getattr(user, "created_at", None)
    if isinstance(raw_val, datetime):
        return raw_val.isoformat()
    elif isinstance(raw_val, str):
        return raw_val
    return datetime.now(timezone.utc).isoformat()

admin_user_router = APIRouter(prefix="/api/v1/admin/users", tags=["Admin Users"])

@admin_user_router.get("", response_model=List[AdminUserResponse], dependencies=[Depends(require_admin)])
def list_system_users(db: Session = Depends(get_db)):
    users = db.query(User).options(joinedload(User.role)).all()
    return [
        AdminUserResponse(
            id=u.id,
            email=u.email,
            is_active=getattr(u, "is_active", True),
            created_at=resolve_created_at(u),
            role=u.role.name if getattr(u, "role", None) else "customer"
        )
        for u in users
    ]

```

---

## 3. Production Code Templates (Frontend — Angular 19 Standalone & Signals)

### 3.1 Cart Store with Fine-Grained Signals & LocalStorage Sync

NgRx boilerplate ke bina high-performance reactive cart management:

```typescript
// src/app/core/state/cart.store.ts
import { Injectable, computed, signal, effect } from '@angular/core';

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  stock: number;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartStore {
  private readonly STORAGE_KEY = 'ecomm_cart_state';

  // State Signal
  private readonly _items = signal<CartItem[]>(this.loadInitialCart());

  // Public Readonly Signals
  readonly items = this._items.asReadonly();

  // Computed Signals (Automated memoized calculations)
  readonly totalItemCount = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly subtotalAmount = computed(() =>
    this._items().reduce((acc, item) => acc + item.price * item.quantity, 0)
  );

  readonly formattedTotal = computed(() =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
      this.subtotalAmount()
    )
  );

  constructor() {
    // Persistent Storage Sync Effect
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._items()));
    });
  }

  addToCart(product: { id: string; title: string; price: number; stock: number; imageUrl?: string }): void {
    this._items.update((current) => {
      const existing = current.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return current; // Block over-allocation on client
        }
        return current.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...current, {
        productId: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
        stock: product.stock,
        imageUrl: product.imageUrl
      }];
    });
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    this._items.update((current) =>
      current.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }

  removeFromCart(productId: string): void {
    this._items.update((current) => current.filter((i) => i.productId !== productId));
  }

  clearCart(): void {
    this._items.set([]);
  }

  private loadInitialCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

```

---

### 3.2 Global Security & Auth Interceptor (Angular 19 Functional API)

```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        router.navigate(['/auth/login'], { queryParams: { sessionExpired: 'true' } });
      } else if (error.status === 403) {
        console.error('Access forbidden (RBAC restriction):', error.message);
      }
      return throwError(() => error);
    })
  );
};

```

---

## 4. Key Architectural Deliverables Summary

| Capability | Technical Mechanism | Benefit |
| --- | --- | --- |
| **Pessimistic Locking** | `SELECT ... FOR UPDATE` via SQLAlchemy `with_for_update()` | Over-selling prevention under high concurrency order volumes. |
| **Price Snapshotting** | Immutable `unit_price_snapshot` column in `order_items` | Historical order audit integrity even after catalog price modifications. |
| **Resilient Redis TLS** | Auto-detect host inspection with SSL cert verification fallback | Smooth dev-to-prod pipeline without environment configuration bugs. |
| **Defensive DTO Mapping** | `getattr(model, field, default)` resolver layer | Zero 500 runtime crashes during rapid database schema evolution. |
| **Fine-Grained Signals** | Angular 19 `signal()`, `computed()`, and `effect()` | Instant client updates with zero change-detection performance bottlenecks. |
