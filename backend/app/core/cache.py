# app/core/cache.py
from app.core.redis_client import redis_client

def check_redis():
    try:
        return redis_client.ping()
    except Exception as e:
        print(f" Redis ping warning: {e}")
        return False