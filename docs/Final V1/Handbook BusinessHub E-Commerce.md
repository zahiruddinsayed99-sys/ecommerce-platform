## 1. Prerequisites: WSL & Docker Environment Setup

Before touching any code, ensure your local workspace matches production parity using **WSL 2 (Ubuntu)** and **Docker Desktop**.

* **Why WSL?** Running Linux locally ensures your file paths, script executions, and backend server runtimes (Python/FastAPI) match the Linux-based cloud infrastructure (Render) where they will be deployed.
* **Docker Desktop Integration:** Ensure Docker Desktop is installed on Windows with **WSL 2 Integration** enabled for your Ubuntu distro. This lets you spin up databases and caching layers instantly without polluting your host machine.

---

## 2. Git & GitHub Collaboration Workflow

Whenever you pick up a task or bug fix, follow this standard version control lifecycle:

1. **Pull the Latest Changes:** Always start on `main` or `develop` and pull the latest code to avoid conflicts.
```bash
git checkout main
git pull origin main

```


2. **Create a Feature Branch:** Name your branch clearly based on what you are building (e.g., using conventional prefixes).
```bash
git checkout -b feature/add-payment-validation

```


3. **Stage and Commit Cleanly:** Write concise commit messages explaining *what* and *why*.
```bash
git add .
git commit -m "feat(orders): add signature validation for razorpay webhook"

```


4. **Push and Open a Pull Request (PR):**
```bash
git push origin feature/add-payment-validation

```


*Go to GitHub, open a PR against `main`, request a review, and ensure all automated tests pass before merging.*

---

## 3. Local Environment Configuration (.env Templates)

Never hardcode secrets, database passwords, or API keys in code. Both projects rely on local `.env` files inside the `backend/` directory. Create a `.env` file using the templates below based on your active project.

### A. BusinessHub AI Local `.env` Template

```env
# App Settings
PROJECT_NAME="BusinessHub AI"
ENVIRONMENT="development"
DEBUG=true

# Database (Local Docker PostgreSQL with pgvector)
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/businesshub_dev"

# Redis Cache & Background Locks
REDIS_URL="redis://localhost:6379/0"

# Security & JWT (Asymmetric RS256)
SECRET_KEY="your-local-development-secret-key-change-me"
JWT_ALGORITHM="RS256"

# Third-Party APIs (Gemini & Stripe Test Keys)
GEMINI_API_KEY="your-gemini-api-key"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

```

### B. Enterprise E-Commerce Platform Local `.env` Template

```env
# App Settings
PROJECT_NAME="Enterprise E-Commerce"
ENVIRONMENT="development"

# Database (Local Docker PostgreSQL)
DATABASE_URL="postgresql+asyncpg://ecommerce_user:ecommerce_password@localhost:5432/ecommerce_db"

# Redis Cache
REDIS_URL="redis://localhost:6379/1"

# Security & JWT
SECRET_KEY="your-local-ecommerce-secret-key"
JWT_ALGORITHM="HS256"

# Payment Gateway (Razorpay Test Keys)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret"

```

---

## 4. Running Automated Tests (Pytest)

To verify that your code changes haven't broken existing business logic, authentication rules, or database models, run the test suite locally using `pytest`.

### Steps to Run Tests in WSL:

1. Ensure your backend virtual environment is active and test requirements are installed:
```bash
cd backend
source venv/bin/activate
pip install pytest pytest-asyncio httpx

```


2. Run the test suite:
```bash
pytest -v

```


3. **Running Specific Test Modules:** If you only want to test a specific file (e.g., auth or orders):
```bash
pytest tests/test_auth.py -v

```


* *Junior Tip:* Ensure your local test database is clean or configured to run against an isolated trial schema so tests don't overwrite your manual development data.



---

## 5. Project 1: BusinessHub AI (Lifecycle & Operations)

### Tech Stack Snapshot

* **Frontend:** Angular 19 Standalone Components (Vercel)[cite: 6, 7, 11]
* **Backend:** FastAPI, Python 3.11, Async SQLAlchemy 2.0 (Render)[cite: 7, 11]
* **Database:** Supabase PostgreSQL with `pgvector` extension[cite: 6, 11]
* **Cache & Async:** FastAPI `BackgroundTasks` + Render Redis[cite: 6, 7, 11]

### A. Local Development Workflow (WSL + Docker)

1. **Spin up Infrastructure Containers:** Start PostgreSQL and Redis locally.
```bash
docker-compose up -d postgres redis

```


2. **Run Backend (FastAPI):**
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

```


* *Junior Tip:* Access the interactive auto-generated Swagger documentation at `http://localhost:8000/docs`[cite: 6].


3. **Run Frontend (Angular):** Open a second WSL terminal tab:
```bash
cd frontend
npm install
ng serve

```


* *Junior Tip:* Open your browser at `http://localhost:4200` to interact with the app.



### B. Database Migrations (Alembic)

* **Apply Pending Changes:** Whenever schema changes are pulled from Git, run:
```bash
alembic upgrade head
```[cite: 7]

```


* **Roll Back a Migration:** If a migration breaks something locally:
```bash
alembic downgrade -1
```[cite: 7]

```


* *Junior Gotcha:* If you are adding vector columns for RAG embeddings, ensure your Alembic script explicitly includes `import pgvector` so SQLAlchemy can parse the `Vector(1536)` type correctly[cite: 8].

### C. QA & Troubleshooting Common Errors

* **Error: `ModuleNotFoundError: No module named 'psycopg2'**`
* *Why it happens:* SQLAlchemy defaults to synchronous drivers if misconfigured.
* *Fix:* Ensure both `asyncpg` and `psycopg2-binary` are listed in your `requirements.txt`, and your local `DATABASE_URL` uses the asynchronous scheme: `postgresql+asyncpg://...`


* **Error: `OSError: [Errno 101] Network is unreachable` (Supabase)**
* *Why it happens:* Supabase free-tier projects automatically pause after 7 days of inactivity.
* *Fix:* Log into your Supabase dashboard and click **Restore Project**. If using connection pooling, switch to port `6543`.


* **Multi-Tenant Header Rule:** When testing backend endpoints manually via Postman or Curl, remember that the `TenantContext` middleware requires two mandatory headers: `Authorization: Bearer <token>` and `X-Organization-Id: <uuid>`[cite: 6].

---

## 6. Project 2: Enterprise E-Commerce Platform (Lifecycle & Operations)

### Tech Stack Snapshot

* **Frontend:** Angular 19 Material UI (Vercel)[cite: 13]
* **Backend:** FastAPI / Python with modular routers (Render)[cite: 13]
* **Database:** Supabase PostgreSQL managed via Alembic
* **Payments:** Razorpay Integration

### A. Local Development Workflow (WSL + Docker)

1. **Run Full Stack via Docker Compose:** For a completely containerized setup:
```bash
docker-compose up --build -d

```


2. **Hybrid Local Setup (Alternative):** Run databases in Docker and code natively in WSL:
```bash
docker-compose up -d postgres redis
# Run backend and frontend manually in separate terminal tabs as shown in Project 1.

```



### B. Routine Maintenance & Operations

* **Database Backups (`pg_dump`):** Before testing risky data updates, back up your local/staging PostgreSQL database:
```bash
docker exec -t ecommerce-postgres pg_dump -U ecommerce_user -F c ecommerce_db > backup_$(date +%Y%m%d).dump

```


* **Clearing Redis Cache:** If dashboard metrics or admin panels display stale cached data:
```bash
docker exec -it ecommerce-redis redis-cli
FLUSHALL

```



### C. QA & Troubleshooting Common Errors

* **Debugging 500 Internal Server Errors:** If the backend throws a 500 error, never guess—inspect live container logs immediately to read the full Python stack trace:
```bash
docker logs ecommerce-backend --tail 100 -f

```


* **Inventory Race Conditions:** When testing simultaneous checkouts, verify that inventory deduction queries use row-level locking (`with_for_update()`) to prevent overselling products[cite: 13].
* **Razorpay Webhook Validation:** Ensure your test environment correctly passes signature hashes in the headers; otherwise, payment confirmation callbacks will be rejected by the backend.

---