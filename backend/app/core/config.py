import socket
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "E-Commerce Platform API"
    APP_VERSION: str = "1.0.0"

    # Direct override URL (ideal for Supabase, Render, production)
    DATABASE_URL: Optional[str] = None

    # Fallback individual fields for local/Docker setups
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ecommerce_db"
    POSTGRES_USER: str = "ecommerce_user"
    POSTGRES_PASSWORD: str = "ecommerce_password"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    @property
    def database_url(self) -> str:
        """Returns sync URL for Alembic migrations."""
        if self.DATABASE_URL:
            # Ensure it uses synchronous driver if a generic postgresql:// is provided
            url = self.DATABASE_URL
            if "postgresql+asyncpg://" in url:
                url = url.replace("postgresql+asyncpg://", "postgresql://")
            return url

        host = self.POSTGRES_HOST
        if host == "postgres":
            try:
                socket.gethostbyname("postgres")
            except socket.gaierror:
                host = "localhost"

        return (
            f"postgresql://"
            f"{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@"
            f"{host}:"
            f"{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )

    @property
    def database_url_async(self) -> str:
        """Returns async URL for FastAPI application database engine."""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def redis_url(self) -> str:
        host = self.REDIS_HOST
        if host == "redis":
            try:
                socket.gethostbyname("redis")
            except socket.gaierror:
                host = "localhost"
        return f"redis://{host}:{self.REDIS_PORT}"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()