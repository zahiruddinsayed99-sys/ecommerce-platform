# app/core/redis_client.py
import os
import redis
from app.core.config import settings

def get_redis():
    # 1. Priority: Agar REDIS_URL Render me set hai
    redis_url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL")
    if redis_url:
        return redis.Redis.from_url(redis_url, decode_responses=True)

    # 2. Individual host/port/password
    host = settings.REDIS_HOST
    port = int(settings.REDIS_PORT)
    password = getattr(settings, "REDIS_PASSWORD", None)
    
    # Agar Upstash cloud host hai toh SSL zaroori hai
    use_ssl = host not in ("localhost", "127.0.0.1", "redis")
    
    return redis.Redis(
        host=host,
        port=port,
        password=password,
        ssl=use_ssl,
        ssl_cert_reqs=None,
        decode_responses=True
    )

redis_client = get_redis()

def check_redis() -> bool:
    """Healthcheck helper used by app.main for Redis ping."""
    try:
        if redis_client:
            return bool(redis_client.ping())
        return False
    except Exception as e:
        print(f"Redis ping warning: {e}")
        return False