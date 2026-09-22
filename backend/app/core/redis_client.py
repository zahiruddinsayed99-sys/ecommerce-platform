# app/core/redis_client.py (ya jahan bhi redis client hai)
import os
import redis
from app.core.config import settings

def create_redis_client() -> redis.Redis:
    # 1. Agar direct REDIS_URL diya hai (Render Prod mein sabse best)
    redis_url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL")
    if redis_url:
        return redis.Redis.from_url(redis_url, decode_responses=True)

    # 2. Individual variables (REDIS_HOST, REDIS_PORT)
    host = getattr(settings, "REDIS_HOST", "localhost")
    port = int(getattr(settings, "REDIS_PORT", 6379))
    password = getattr(settings, "REDIS_PASSWORD", None)

    # Auto-detect: Agar host 'redis', 'localhost' ya '127.0.0.1' nahi hai,
    # iska matlab yeh Cloud/Upstash hai -> SSL & Cert bypass enable karein
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

def check_redis():
    return redis_client.ping()
