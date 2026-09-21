from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.health import check_database
from app.core.redis_client import check_redis

from app.modules.auth.routers.auth_router import router as auth_router
from app.modules.catalog.routers.product_router import router as product_router
from app.modules.orders.routers.admin_order_router import (
    admin_router as admin_order_router,
)
from app.modules.orders.routers.order_router import router as order_router
from app.modules.orders.routers.dashboard_router import router as dashboard_router
from app.modules.auth.routers.admin_user_router import admin_user_router
from app.modules.catalog.routers.admin_report_router import admin_report_router
from app.core.handlers import register_exception_handlers

app = FastAPI(title="E-Commerce Platform API", version="1.0.0")

# Mount Static Files Directory
static_dir = Path(__file__).resolve().parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Register CORS Middleware FIRST so headers are always attached
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(order_router)
app.include_router(admin_order_router)
app.include_router(dashboard_router)
app.include_router(admin_user_router)
app.include_router(admin_report_router)



@app.get("/")
def root():
    return {"message": "E-Commerce Platform API Running"}


@app.get("/health")
def health_check():
    postgres_status = "DOWN"
    redis_status = "DOWN"

    try:
        if check_database():
            postgres_status = "UP"
    except Exception:
        postgres_status = "DOWN"
    try:
        if check_redis():
            redis_status = "UP"
    except Exception:
        pass

    return {
        "api": "UP",
        "postgres": postgres_status,
        "redis": redis_status,
    }
