Here is a practical Junior Developer’s Cheat Sheet covering routine development, QA procedures, production architecture, and testing workflows for your Enterprise E-Commerce platform.

---

## Enterprise E-Commerce Platform: Junior Dev Cheat Sheet

### 🏗️ Tech Stack Quick Reference

* **Frontend:** Angular 19 (Deployed on Vercel)
* **Backend:** FastAPI / Python (Deployed on Render)
* **Database & Migrations:** Supabase PostgreSQL managed via Alembic
* **Caching:** Redis (with automatic graceful fallback if unreachable)
* **Storage:** Static assets (`backend/static/product_images/`)

---

### 1. Routine Development Workflow

#### Running the Backend Locally

1. Navigate to the backend directory and activate your virtual environment:
```bash
cd backend
source venv/bin/activate

```


2. Run the FastAPI development server with auto-reload:
```bash
uvicorn app.main:app --reload --port 8000

```


* Access the interactive API docs at: `http://localhost:8000/docs`



#### Running the Frontend Locally

1. Navigate to the frontend directory:
```bash
cd frontend

```


2. Install dependencies and start the local development server:
```bash
npm install
ng serve

```


* Access the app at: `http://localhost:4200`



---

### 2. Database & Migrations (Alembic)

All schema updates and master data seeding (Roles, Admin User, Categories, Products) are managed through Alembic migrations.

* **Check current database revision:**
```bash
alembic current

```


* **Apply all pending migrations & seeds:**
```bash
alembic upgrade head

```


* **Create a new migration after model changes:**
```bash
alembic revision --autogenerate -m "describe your change"

```



---

### 3. QA & Manual Testing Checklist

Before opening a Pull Request, verify the following core flows locally and on preview environments:

* **Authentication & Authorization:**
* Test login with the seeded admin account (`admin@solvexa.com` / `admin123`).
* Verify that protected routes block standard users or unauthenticated requests.


* **Product Catalog & Images:**
* Ensure products load cleanly without 500 errors (even if Redis is offline).
* Confirm all product images render correctly from `backend/static/product_images/`.


* **Database Integrity:**
* Ensure foreign keys (`category_id`, `role_id`, `user_id`) resolve correctly without orphan records.



---

### 4. Production Setup & Deployment

* **Backend (Render):**
* Connected to the `develop` or `main` branch with automatic deploys.
* Required Environment Variables: `DATABASE_URL` (Supabase pooler URL), `SECRET_KEY`, and optional `REDIS_URL`.


* **Frontend (Vercel):**
* Configured to build automatically on push.
* Uses environment configuration pointing to the production FastAPI backend URL (`[https://...onrender.com/api/v1](https://...onrender.com/api/v1)`).



---