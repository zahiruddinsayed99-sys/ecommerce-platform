# Operations Runbook (Day-2 Guide)

## Overview
This document outlines standard operating procedures for maintaining the production environment of the Enterprise E-Commerce Platform.

## 1. Production Maintenance Procedures

### Deploying Updates
1. Ensure all CI/CD pipeline checks are green.
2. Pull latest images from the container registry.
3. Gracefully restart services: `docker-compose -f docker-compose.prod.yml up -d --build`

### Database Backups
*   **Automated:** Configure daily pg_dump cron jobs.
*   **Manual Backup:**
    ```bash
    docker exec -t ecommerce-postgres pg_dump -U ecommerce_user -F c ecommerce_db > backup_$(date +%Y%m%d).dump
    ```

## 2. Database Migration Management

All schema changes must be processed through Alembic.
*   **Generate Migration:**
    ```bash
    docker exec -it ecommerce-backend alembic revision --autogenerate -m "Description"
    ```
*   **Apply Migration:**
    ```bash
    docker exec -it ecommerce-backend alembic upgrade head
    ```
*   **Rollback Migration:**
    ```bash
    docker exec -it ecommerce-backend alembic downgrade -1
    ```

## 3. Cache Clearing

If stale data is observed (e.g., on the Admin Dashboard):
*   Access the Redis container:
    ```bash
    docker exec -it ecommerce-redis redis-cli
    ```
*   Clear specific keys or flush all:
    ```bash
    FLUSHALL
    ```

## 4. System Scaling Steps

*   **Vertical Scaling:** Increase CPU/Memory limits in the Docker Compose / Orchestration configuration.
*   **Horizontal Scaling (Backend):**
    *   Deploy additional instances of `ecommerce-backend`.
    *   Place a reverse proxy (e.g., Nginx or Traefik) in front to load balance incoming traffic on port 8000 across multiple backend nodes.

## 5. Troubleshooting Production Crash Logs

*   **View Backend Logs:**
    ```bash
    docker logs ecommerce-backend --tail 100 -f
    ```
*   **Common Scenarios:**
    *   **500 Internal Server Error:** Check backend logs for Python stack traces. Likely a database connection issue or unhandled `NoneType`.
    *   **Database Timeout:** Indicates connection pool exhaustion or a deadlocked row. Investigate active queries in PostgreSQL.
    *   **Payment Webhook Failure:** Validate Razorpay API keys in `.env` and ensure the external webhook endpoint is reachable.
