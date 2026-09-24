# All-in-One Production Deployment Runbook (100% Free Tier)

**Target Topology:** Supabase (PostgreSQL) + Render (FastAPI Docker Backend) + Vercel (Angular Frontend) + Upstash (Redis)

**Applicable Projects:**

1. **BusinessHub AI** (Multi-Tenant SaaS, pgvector, Celery/Redis, Angular 20)


2. **Enterprise E-Commerce Platform** (PostgreSQL 17, Redis 8, Snapshot Pricing, Angular 19)



---

## 1. Quick Architecture & Free-Tier Plan Matrix

```
                     ┌──────────────────────────────────────────────┐
                     │          Vercel (Global Edge CDN)            │
                     │          Angular 19 / 20 Frontend            │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTPS API Calls (Bearer JWT)
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │          Render (Web Service / Docker)       │
                     │             FastAPI Python 3.12 Backend      │
                     └──────────────┬────────────────┬──────────────┘
                                    │                │
            PostgreSQL Over Pooling │                │ Cache / Webhook Lock / Celery
            (Port 6543 / 5432)      ▼                ▼ (TLS redis:// / rediss://)
 ┌─────────────────────────────────────────┐  ┌────────────────────────────────────────┐
 │        Supabase Managed PostgreSQL      │  │        Upstash Serverless Redis        │
 │ - BusinessHub: PostgreSQL 16 + pgvector │  │ - BusinessHub: Celery Queue & RBAC Cache│
 │ - E-Commerce: PostgreSQL 17 + Snapshots │  │ - E-Commerce: Idempotency & Catalog    │
 └─────────────────────────────────────────┘  └────────────────────────────────────────┘

```

| Component | Cloud Provider | Free Tier Limits | Cold-Start / Sleep Mitigation |
| --- | --- | --- | --- |
| **Database** | **Supabase**<br> | 500 MB storage, Shared CPU, IPv4/IPv6 pooling | Pauses after 7 days of inactivity; ping periodically. |
| **Backend API** | **Render**<br> | 512 MB RAM, 0.1 CPU, Docker runtime | Spins down after 15 mins of inactivity (takes ~50s to wake up). |
| **Frontend SPA** | **Vercel**<br> | 100 GB bandwidth/month, Edge CDN | Instant; zero sleep, global caching. |
| **Cache & Tasks** | **Upstash**<br> | 10,000 commands/day, 256 MB storage | Serverless; never sleeps, pay-as-you-go ($0 on free tier). |

---

## 2. Step 1: Database Setup on Supabase

Dono projects ke liye Supabase mein alag projects banayein ya alag databases use karein.

### 2.1 Project Creation

1. Go to [supabase.com](https://www.google.com/search?q=https://supabase.com&utm_source=gemini) and create a free account.
2. Click **New Project**:
* **Name:** `businesshub-prod-db` (ya `ecommerce-prod-db`)
* **Database Password:** Strong password generate karein aur secure jagah save karein.
* **Region:** Apne audience ke paas ka region select karein (e.g., `ap-south-1` Mumbai ya `ap-southeast-1` Singapore).



### 2.2 Extension Activation (Crucial for BusinessHub AI)

BusinessHub AI ke liye `pgvector` extension mandatory hai:

1. Supabase Dashboard mein **SQL Editor** par jayein.
2. Run this SQL query:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

```

(Enterprise E-Commerce ke liye sirf `uuid-ossp` run karein).

### 2.3 Connection String Extraction

1. Supabase mein **Project Settings** $\rightarrow$ **Database** par jayein.
2. **Connection string** section mein **URI** select karein.
3. Mode ko **Transaction Pooling (Port 6543)** ya **Session (Port 5432)** par set karein:
* SQLAlchemy 2.0 Async (BusinessHub AI) ke liye:
```text
postgresql+asyncpg://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

```


* Synchronous SQLAlchemy (E-Commerce Platform) ke liye[cite: 1]:
```text
postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

```




*(Note: Password mein special characters hone par unhein URL-encode karein, e.g., `@` becomes `%40`).*

---

## 3. Step 2: Redis Setup on Upstash (Serverless)

Upstash Redis sessions, RBAC cache, webhook locks, aur Celery task broker ke liye use hota hai[cite: 8, 13].

1. Go to [upstash.com](https://www.google.com/search?q=https://upstash.com&utm_source=gemini) aur login karein.
2. Click **Create Database**:
* **Name:** `businesshub-redis` (ya `ecommerce-redis`)
* **Region:** Same region as Supabase (e.g., Mumbai/Singapore for lowest latency).
* **Type:** Serverless.


3. Database dashboard se **`UPSTASH_REDIS_URL`** (format: `rediss://default:[PASSWORD]@[HOST]:[PORT]`) copy karein.
*(Note: Celery/Redis connection string mein double `s` (`rediss://`) secure TLS connection indicate karta hai).*

---

## 4. Step 3: Backend Deployment on Render

Render par backend ko deploy karne ke liye Dockerfile use karna sabse reliable rehta hai taaki OS dependencies clean rahein.

### 4.1 Production Dockerfile Setup

Make sure aapke backend root directory mein ek clean `Dockerfile` ho:

```dockerfile
FROM python:3.12-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port (Render sets $PORT dynamically)
ENV PORT=8000
EXPOSE 8000

# Start ASGI application
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"

```

### 4.2 Render Web Service Creation

1. Go to [render.com](https://www.google.com/search?q=https://render.com&utm_source=gemini) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository:
* **Root Directory:** `backend` (agar monorepo hai) ya empty chhod dein[cite: 9, 10].
* **Environment:** `Docker`

* **Instance Type:** `Free`


3. Click **Advanced** $\rightarrow$ **Add Environment Variable**.

### 4.3 Environment Variables Configuration

#### A. For BusinessHub AI:

```ini
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres
REDIS_URL=rediss://default:[PASS]@[UPSTASH-HOST]:[PORT]
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALLOWED_ORIGINS="https://your-businesshub.vercel.app"
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=AIzaSy...

```

*(JWT RSA keys terminal mein generate karein: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`)[cite: 23].*

#### B. For Enterprise E-Commerce Platform:

```ini
ENVIRONMENT=production
SQLALCHEMY_DATABASE_URI=postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
REDIS_URL=rediss://default:[PASS]@[UPSTASH-HOST]:[PORT]
JWT_SECRET_KEY=generate_random_64_char_hex_secret
ALLOWED_ORIGINS="https://your-ecommerce.vercel.app"
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

```

### 4.4 Running Alembic Migrations & Seed Data

Render deployment live hone ke baad database tables create karni hoti hain[cite: 10, 16]:

1. Render dashboard mein apne service par click karein aur **Shell** tab open karein.
2. Migration commands run karein:
```bash
# Apply migrations to Supabase
alembic upgrade head

```


3. (Optional) Initial seed data populate karein:
* **BusinessHub AI:** Startup scripts automatically default roles populate kar dete hain[cite: 8, 20].
* **E-Commerce:** Run `python -m scripts.bootstrap` (seeds 30 SVG products & 3 demo users)[cite: 5].


4. Test health endpoint: `[https://your-service.onrender.com/healthz](https://your-service.onrender.com/healthz)` (BusinessHub) ya `/health` (E-Commerce)[cite: 2]. Returns `{"status":"healthy"}`.



---

## 5. Step 4: Frontend Deployment on Vercel

Angular Standalone Applications ko Vercel edge par deploy karna instant aur robust hai.

### 5.1 Environment Configuration Files

Deploy karne se pehle frontend production environment file mein Render Backend URL point karein:

* For Angular: `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-service.onrender.com/api/v1'
};

```

### 5.2 SPA Rewrite Configuration (`vercel.json`)

Angular Single Page Application (SPA) hone ke karan direct link refresh karne par 404 error na aaye, iske liye frontend folder root mein `vercel.json` file create karein:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}

```

### 5.3 Vercel Project Setup

1. Go to [vercel.com](https://www.google.com/search?q=https://vercel.com&utm_source=gemini) aur GitHub account se login karein.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository:
* **Framework Preset:** Select `Angular`.
* **Root Directory:** `frontend` (ya monorepo path select karein, e.g., `frontend/ecommerce-frontend`)[cite: 5, 10].
* **Build Command:** `npm run build` (ya `ng build --configuration production`)[cite: 5].
* **Output Directory:** `dist/your-app-name/browser` (Angular 19/20 outputs to `dist/<app>/browser`)[cite: 5].


4. Click **Deploy**. Vercel 1-2 minutes mein application ko live URL assign kar dega (`[https://your-app.vercel.app](https://your-app.vercel.app)`).

---

## 6. Step 5: Post-Deployment Verification (Smoke Test)

Donon platforms live hone ke baad yeh 4-step quick verification run karein:

1. **CORS Validation:**
* Browser mein Vercel URL kholein. DevTools $\rightarrow$ Console inspect karein.
* Verify karein ki koi CORS error (`Access-Control-Allow-Origin`) block nahi ho raha hai. Agar ho raha hai, toh Render ke `ALLOWED_ORIGINS` variable mein exact Vercel URL verify karein.


2. **Authentication Flow:**
* User register / login trigger karein.
* DevTools $\rightarrow$ Application Storage mein check karein: Access token local storage/signals mein set ho raha hai aur refresh token secure cookie mein aa raha hai[cite: 1, 11].


3. **Database Write Confirmation:**
* BusinessHub AI: Ek test workspace register karein (`POST /auth/onboard`)[cite: 12, 19]. Supabase dashboard $\rightarrow$ Table Editor $\rightarrow$ `organizations` mein row verify karein[cite: 19].
* E-Commerce Platform: Cart mein item add karke COD order checkout karein[cite: 1, 6]. Supabase table `orders` aur `order_items` mein snapshot pricing rows inspect karein.




4. **Handling Free-Tier Cold Starts:**
* Render Free-tier 15 minute baad sleep mode mein chala jata hai. Pehli request mein ~40-50 seconds lag sakte hain.
* *Interview Pro-Tip:* Batayein ki production SLA ke liye hum Cron-Job ping service (jaise UptimeRobot ya cron-job.org) configure kar sakte hain jo `/healthz` endpoint ko har 14 minute par hit karke instance ko 24/7 warm rakhti hai.