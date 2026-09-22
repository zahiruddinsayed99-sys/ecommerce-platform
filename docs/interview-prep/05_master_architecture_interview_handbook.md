# 05_Enterprise_ECommerce_Code_Architecture_and_Implementation_Templates.md

# Enterprise E-Commerce Platform: Code Architecture aur Implementation Templates

> **Document Classification:** Code-Level Engineering Templates, Backend Domain Contracts & Angular 19 Reactive Stores
> 
> 
> **Target Audience:** Full-Stack Engineers, Technical Leads & Solution Architects
> **Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, PostgreSQL 17, Pydantic v2, Angular 19+ (Standalone + Signals)
> 
> 

---

## 1. Architectural Philosophy & Layer Contracts

Enterprise applications mein non-negotiable boundaries hoti hain. Hobby projects ka sabse bada anti-pattern hota hai: request payloads ko direct database sessions mein pass karna ya raw database ORM entities ko JSON responses mein return karna. Is platform mein har layer strict contracts enforce karti hai:

```
[ HTTP Ingress / Pydantic v2 Payload ]
                │
                ▼
┌──────────────────────────────────────────────┐
│             FastAPI Router Layer             │
│  - Parameter & Body validation (Pydantic)    │
│  - Auth Context Dependency Injection (JWT)   │
│  - HTTP Status mapping (201, 200, 204)       │
└──────────────────────┬───────────────────────┘
                       │ Passes DTO or Entity ID
                       ▼
┌──────────────────────────────────────────────┐
│             Domain Service Layer             │
│  - Business logic & totals calculation       │
│  - Pessimistic locking orchestration         │
│  - Snapshot capture (Pricing / Titles / SKU) │
│  - Manages Unit of Work (Commit / Refresh)   │
└──────────────────────┬───────────────────────┘
                       │ Executes queries via ORM models
                       ▼
┌──────────────────────────────────────────────┐
│           Repository Access Layer            │
│  - Direct SQLAlchemy 2.x session queries     │
│  - Eager joins (`joinedload`)                │
│  - No business math, pure persistence        │
└──────────────────────┬───────────────────────┘
                       │ SQL Statements
                       ▼
┌──────────────────────────────────────────────┐
│            PostgreSQL 17 Database            │
└──────────────────────────────────────────────┘

```

### The Entity vs. DTO Separation Principle

Sprint 4.6A mein ek architectural bug fix kiya gaya: service layer ke mutation methods serialized dictionaries receive kar rahe the bajay attached SQLAlchemy models ke, jisse unit-of-work tracking fail ho rahi thi.

Platform do methods ka strict convention enforce karta hai across all domain modules:

1. `get_<entity>()`: Database se data fetch karke Pydantic DTO mein map karta hai aur client API response ke liye serialize karta hai (read-only presentation).


2. `get_<entity>_entity()`: Active open database session mein attached SQLAlchemy ORM model return karta hai taaki direct mutations, status updates aur transactional locking ho sake.



---

## 2. Backend Implementation Templates (FastAPI / Python 3.12)

### 2.1 Database Core & Session Configuration (`app/database/session.py`)

```python
"""
Database session management with SQLAlchemy 2.x.
Provides thread-local synchronous session lifecycle generator.
"""
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Pool size and max overflow configured for high-concurrency requests
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    future=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
    expire_on_commit=False  # Crucial: Keeps attributes loaded after commit
)

Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Dependency injection helper providing clean session teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

```

---

### 2.2 SQLAlchemy Domain Models (`app/modules/orders/models/order.py`)

Financial audit integrity ke liye Snapshot Pricing columns add kiye gaye hain:

```python
"""
Relational mappings for Orders and OrderItems.
Implements the Snapshot Pricing Strategy for financial audit compliance.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.modules.orders.enums import OrderStatus, PaymentMethod, PaymentStatus, Currency

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_number = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    total_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(Enum(Currency), default=Currency.INR, nullable=False)
    
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.COD, nullable=False)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    payment_reference = Column(String(255), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    
    shipping_address = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relational associations
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)

    # Immutable Snapshot fields (Critical Financial Guard)
    product_name = Column(String(255), nullable=False)
    product_sku = Column(String(64), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")

```

---

### 2.3 Repository Layer (`app/modules/orders/repositories/order_repository.py`)

Repository layer pure SQL queries execute karti hai, isme koi business logic ya totals calculation nahi hoti:

```python
"""
Persistence isolation layer for Orders.
Contains zero business math; responsible purely for SQL construction and query execution.
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, joinedload
from app.modules.orders.models.order import Order

class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, order_id: UUID, user_id: Optional[UUID] = None) -> Optional[Order]:
        """Loads order with items and user eager-loaded. Supports tenant isolation."""
        stmt = (
            select(Order)
            .options(joinedload(Order.items), joinedload(Order.user))
            .where(Order.id == order_id)
        )
        if user_id:
            stmt = stmt.where(Order.user_id == user_id)
        return self.db.execute(stmt).scalars().first()

    def list_by_user(self, user_id: UUID, skip: int = 0, limit: int = 50) -> List[Order]:
        stmt = (
            select(Order)
            .options(joinedload(Order.items))
            .where(Order.user_id == user_id)
            .order_by(desc(Order.created_at))
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def create(self, order: Order) -> Order:
        self.db.add(order)
        self.db.flush()  # Flushes IDs without releasing transaction boundary
        return order

```

---

### 2.4 Domain Service Layer with Pessimistic Row Locking (`app/modules/orders/services/order_service.py`)

Checkout ke time `with_for_update()` ke zariye database-level row lock acquire hota hai taaki flash sale mein overselling na ho:

```python
"""
Domain business orchestration engine.
Calculates snapshot totals, allocates inventory with row locks, and controls commits.
"""
import uuid
from decimal import Decimal
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.orders.models.order import Order, OrderItem
from app.modules.orders.schemas.order_schema import OrderCreateSchema
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.catalog.models.product import Product
from app.modules.catalog.models.inventory import Inventory
from app.modules.orders.enums import OrderStatus, PaymentStatus, Currency

class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.order_repo = OrderRepository(db)

    def create_customer_order(self, user_id: uuid.UUID, payload: OrderCreateSchema) -> Order:
        """
        Transactional Checkout Method:
        1. Generates human-readable enterprise order number.
        2. Acquires row lock (SELECT FOR UPDATE) on inventory to prevent overselling.
        3. Snapshots current catalog prices and names to OrderItem rows.
        4. Calculates ledger total and commits atomically.
        """
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        running_total = Decimal("0.00")
        order_items: List[OrderItem] = []

        try:
            for item in payload.items:
                # 1. Fetch Product Entity
                product = self.db.execute(
                    select(Product).where(Product.id == item.product_id)
                ).scalars().first()
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Product with ID {item.product_id} does not exist"
                    )

                # 2. Acquire Pessimistic Row Lock on Inventory
                inv_stmt = (
                    select(Inventory)
                    .where(Inventory.product_id == item.product_id)
                    .with_for_update()
                )
                inventory = self.db.execute(inv_stmt).scalars().first()
                if not inventory or inventory.stock_quantity < item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for product: {product.name} (SKU: {product.sku})"
                    )

                # 3. Deduct Stock Inventory
                inventory.stock_quantity -= item.quantity

                # 4. Calculate Snapshot Subtotal
                line_subtotal = Decimal(str(product.price)) * Decimal(str(item.quantity))
                running_total += line_subtotal

                # 5. Build Immutable Order Item Row
                order_item = OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    product_sku=product.sku,
                    unit_price=product.price,
                    subtotal=line_subtotal,
                    quantity=item.quantity
                )
                order_items.append(order_item)

            # 6. Build and Persist Master Order
            new_order = Order(
                order_number=order_number,
                user_id=user_id,
                total_amount=running_total,
                currency=Currency.INR,
                status=OrderStatus.PENDING,
                payment_method=payload.payment_method,
                payment_status=PaymentStatus.PENDING,
                shipping_address=payload.shipping_address,
                items=order_items
            )

            self.order_repo.create(new_order)
            self.db.commit()
            self.db.refresh(new_order)
            return new_order

        except Exception:
            self.db.rollback()
            raise

```

---

### 2.5 API Presentation Router (`app/modules/orders/routers/order_router.py`)

```python
"""
Thin FastAPI presentation router.
Enforces request validation schemas and explicit response_model DTO contracts.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_active_user
from app.modules.users.models.user import User
from app.modules.orders.schemas.order_schema import OrderCreateSchema, OrderResponseSchema
from app.modules.orders.services.order_service import OrderService
from app.modules.orders.repositories.order_repository import OrderRepository

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post(
    "",
    response_model=OrderResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create customer order"
)
def create_order(
    payload: OrderCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    service = OrderService(db)
    return service.create_customer_order(user_id=current_user.id, payload=payload)

@router.get(
    "",
    response_model=List[OrderResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Fetch current customer order history"
)
def list_my_orders(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    repo = OrderRepository(db)
    return repo.list_by_user(user_id=current_user.id, skip=skip, limit=limit)

```

---

## 3. Frontend Implementation Templates (Angular 19 Standalone & Signals)

### 3.1 Reactive Signals State Store (`src/app/core/services/cart.service.ts`)

Cart store reactive signals par operate karta hai bina kisi NgRx boilerplate ke:

```typescript
import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Fine-grained Reactive Signals
  private readonly _cartItems = signal<CartItem[]>([]);
  
  // Public Read-Only Projections
  readonly cartItems = this._cartItems.asReadonly();
  
  // Memoized Computed Signal for Cart Total
  readonly totalAmount = computed(() => {
    return this._cartItems().reduce(
      (acc, item) => acc + (item.price * item.quantity), 
      0
    );
  });

  // Memoized Computed Signal for Total Item Count
  readonly totalItemsCount = computed(() => {
    return this._cartItems().reduce((acc, item) => acc + item.quantity, 0);
  });

  addItem(product: { id: string; name: string; sku: string; price: number; imageUrl: string }): void {
    this._cartItems.update(items => {
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        return items.map(i => 
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { ...product, productId: product.id, quantity: 1 }];
    });
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this._cartItems.update(items =>
      items.map(i => i.productId === productId ? { ...i, quantity } : i)
    );
  }

  removeItem(productId: string): void {
    this._cartItems.update(items => items.filter(i => i.productId !== productId));
  }

  clearCart(): void {
    this._cartItems.set([]);
  }
}

```

---

### 3.2 Reactive Checkout Form Component (`src/app/features/checkout/checkout.component.ts`)

Postal PIN code validation regex aur serialized delivery address contract enforce karta hai:

```typescript
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly cartService = inject(CartService);

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Address Reactive Form enforcing mandatory 6-digit postal PIN pattern
  readonly addressForm = this.fb.group({
    addressLine1: ['', [Validators.required, Validators.minLength(5)]],
    addressLine2: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pinCode: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]{5}$/)]]
  });

  submitOrder(): void {
    if (this.addressForm.invalid || this.cartService.cartItems().length === 0) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const fv = this.addressForm.getRawValue();
    // Serialization contract: <addressLine1, addressLine2, city, state> - <pinCode>
    const serializedAddress = `${fv.addressLine1}${fv.addressLine2 ? ', ' + fv.addressLine2 : ''}, ${fv.city}, ${fv.state} - ${fv.pinCode}`;

    const payload = {
      shipping_address: serializedAddress,
      payment_method: 'COD',
      items: this.cartService.cartItems().map(item => ({
        product_id: item.productId,
        quantity: item.quantity
      }))
    };

    this.http.post<{ id: string; order_number: string }>('/api/v1/orders', payload).subscribe({
      next: (order) => {
        this.cartService.clearCart();
        this.isSubmitting.set(false);
        this.router.navigate(['/orders', order.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Order checkout transaction failed.');
      }
    });
  }
}

```

---

### 3.3 Functional Auth Interceptor with Whitelist (`src/app/core/interceptors/auth.interceptor.ts`)

Public endpoints ko whitelist karke unnecessary CORS preflights aur invalid headers rokta hai:

```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Whitelist login and registration endpoints to prevent unnecessary preflight rejections
  const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/register');

  let clonedRequest = req;
  if (token && !isAuthRequest) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRequest) {
        // Clear local storage and route to login upon session invalidation
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};

```

---

## 4. Key Takeaways Checklist

1. **Explicit DTO Mapping:** Routers hamesha Pydantic v2 `response_model` declare karein; raw SQLAlchemy models kabhi API response mein direct return na karein.


2. **Snapshot Persistence:** Order banate waqt `unit_price`, `product_name`, aur `product_sku` line item row par copy karke freeze karein taaki catalog price badalne par historical ledgers alter na hon.


3. **Pessimistic Row Lock:** Flash sale concurrency mein overselling rokne ke liye `SELECT ... FOR UPDATE` row lock use karein.


4. **Fine-Grained Signals:** Cart calculations aur dynamic totals ke liye Angular 19 Signals + `ChangeDetectionStrategy.OnPush` use karein.


5. **Interceptor Whitelisting:** Auth endpoints (`/auth/login`, `/auth/register`) ko interceptor mein whitelist karein taaki CORS issues na ahein.

