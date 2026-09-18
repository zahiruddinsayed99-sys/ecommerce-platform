# Enterprise E-Commerce Platform - Staging Environment Deployment Guide

This guide provides beginner-friendly, step-by-step instructions for setting up the stage environment for the Enterprise E-Commerce Platform on a free tier using Vercel, Render, and Supabase.

## Architecture Overview

*   **Frontend**: Angular (Standalone) -> Hosted on **Vercel**
*   **Backend**: FastAPI (Python 3.11) + Celery -> Hosted on **Render** (Web Service & Background Worker)
*   **Database**: PostgreSQL (with `pgvector`) -> Hosted on **Supabase**
*   **Cache & Message Broker**: Redis -> Hosted on **Render** (Redis instance)

---

## Step 1: Database Setup (Supabase)

Supabase provides a generous free tier for PostgreSQL hosting, which natively supports `pgvector`.

1.  **Create an Account & Project:**
    *   Go to [Supabase](https://supabase.com/) and sign up.
    *   Click **"New Project"**.
    *   Select your organization, name your project (e.g., `ecommerce-staging`), and generate a strong **Database Password**. *Save this password securely.*
    *   Choose a region close to your target users and click **Create New Project**. It will take a few minutes to provision.

2.  **Enable `pgvector` Extension (If needed in future):**
    *   Once provisioned, go to **Database** (on the left sidebar) -> **Extensions**.
    *   Search for `vector` and enable it.

3.  **Get Database Connection Details:**
    *   Go to **Project Settings** (gear icon) -> **Database**.
    *   Under **Connection Parameters**, note down the `Host`, `Database name`, `Port`, and `User`.
    *   Alternatively, look for the **Connection String** (URI) which looks like:
        `postgresql://[user]:[password]@[host]:[port]/[database]`

---

## Step 2: Cache & Message Broker Setup (Render Redis)

Render offers a free tier for Redis, which will serve as our cache and Celery message broker.

1.  **Create an Account:**
    *   Go to [Render](https://render.com/) and sign up.
2.  **Create a Redis Instance:**
    *   From the Render Dashboard, click **New** -> **Redis**.
    *   Name your instance (e.g., `ecommerce-redis-staging`).
    *   Select the **Free** instance type.
    *   Click **Create Redis**.
3.  **Get Redis Connection URL:**
    *   Once created, you will see an **Internal Redis URL** and an **External Redis URL**.
    *   Copy the **External Redis URL** (e.g., `rediss://red-xxxx:xxxx@region.render.com:6379`). We will use this in our Backend configuration.

---

## Step 3: Backend Setup (Render Web Service)

We will deploy our FastAPI application and Celery worker using Render's Free Web Service.

*(Note: Render free tier spins down after inactivity. Initial requests may take ~50 seconds to cold start).*

1.  **Connect GitHub to Render:**
    *   In the Render Dashboard, click **New** -> **Web Service**.
    *   Connect your GitHub account and select your e-commerce repository.

2.  **Configure the FastAPI Web Service:**
    *   **Name:** `ecommerce-backend-staging`
    *   **Language:** `Python`
    *   **Branch:** `main` (or whichever branch holds your staging code)
    *   **Root Directory:** `backend` (Important! since the backend code is in this folder)
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port 10000`
    *   **Instance Type:** Free

3.  **Set Environment Variables:**
    Scroll down to **Environment Variables** and add the following keys based on your Supabase and Redis details:
    *   `APP_NAME`: `E-Commerce Platform API`
    *   `POSTGRES_HOST`: `<Your Supabase Host>` (e.g., `db.xxxx.supabase.co`)
    *   `POSTGRES_PORT`: `5432`
    *   `POSTGRES_DB`: `<Your Supabase Database>` (usually `postgres`)
    *   `POSTGRES_USER`: `<Your Supabase User>` (usually `postgres`)
    *   `POSTGRES_PASSWORD`: `<Your Supabase Password>`
    *   `REDIS_HOST`: `<Your Render External Redis URL Host>` (e.g., extract `red-xxx.render.com` from your redis URL)
    *   `REDIS_PORT`: `6379`
    *   `RAZORPAY_KEY_ID`: `<Your Razorpay Test Key ID>`
    *   `RAZORPAY_KEY_SECRET`: `<Your Razorpay Test Key Secret>`

4.  **Deploy:** Click **Create Web Service**.

5.  **(Optional) Celery Worker Configuration:**
    If your app runs Celery background tasks, you can create a **New Background Worker** in Render, pointing to the same repo/directory, but with the start command: `celery -A app.worker.celery_app worker --loglevel=info`.

6.  **Database Migrations (Alembic):**
    To initialize your database, you may need to run `alembic upgrade head` either locally pointing to the Supabase database URL, or by running a shell command inside the Render web service environment.

7.  **Get Backend API URL:**
    Once deployed, Render provides a URL (e.g., `https://ecommerce-backend-staging.onrender.com`). Copy this for the Frontend setup.

---

## Step 4: Frontend Setup (Vercel)

Vercel is highly optimized for frontend frameworks and offers a great free tier for Angular applications.

1.  **Create an Account:**
    *   Go to [Vercel](https://vercel.com/) and sign up.
2.  **Import Project:**
    *   From your Vercel Dashboard, click **Add New** -> **Project**.
    *   Import your GitHub repository.
3.  **Configure Project Settings:**
    *   **Project Name:** `ecommerce-frontend-staging`
    *   **Framework Preset:** Vercel should auto-detect **Angular**.
    *   **Root Directory:** Click "Edit" and select `frontend/ecommerce-frontend` (This is crucial!).
4.  **Build & Development Settings:**
    Vercel auto-detects Angular settings, but verify they are correct:
    *   **Build Command:** `npm run build` (or `ng build`)
    *   **Output Directory:** `dist/ecommerce-frontend`
    *   **Install Command:** `npm install`
5.  **Environment Variables:**
    Expand the Environment Variables section and add the backend API URL so your Angular app knows where to send requests:
    *   `API_URL`: `https://ecommerce-backend-staging.onrender.com` (Adjust to your actual backend URL).
6.  **Deploy:**
    *   Click **Deploy**. Vercel will install dependencies, build the Angular app, and host it.
7.  **Verify Frontend:**
    *   Once the build completes, Vercel gives you a public URL. Visit the URL to verify your E-Commerce platform is up and running!

## Summary
You now have a complete, free-tier staging environment!
*   Your Angular frontend makes requests to the FastAPI backend.
*   The FastAPI backend processes requests, queries the PostgreSQL database on Supabase, and uses Render Redis for caching/Celery brokering.
