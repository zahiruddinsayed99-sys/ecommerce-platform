# Enterprise E-Commerce Platform

![Status](https://img.shields.io/badge/Status-Feature_Complete-success)
![Milestone](https://img.shields.io/badge/Milestone-1_Complete-blue)
![Backend Coverage](https://img.shields.io/badge/Backend_Coverage-88%25-brightgreen)
![Frontend Coverage](https://img.shields.io/badge/Frontend_Coverage-87%25-brightgreen)

## Project Overview
The Enterprise E-Commerce Platform is a robust, full-stack web application designed for scalability, data integrity, and high performance. The project has successfully reached **Milestone 1 (Portfolio MVP Release)** and is currently classified as a **Production Candidate (98-99% complete)**, transitioning into the infrastructure provisioning and deployment phase.

### Technical Health: 9.6 / 10
*   **Architecture:** 10 / 10
*   **Maintainability:** 9.8 / 10

---

## 🛠 Tech Stack

### Frontend
*   **Framework:** Angular 19
*   **State Management & Forms:** Reactive Forms
*   **UI/UX:** Custom Design System, Responsive Layouts

### Backend
*   **Framework:** FastAPI (Python 3.11+)
*   **Database:** PostgreSQL with SQLAlchemy 2.x ORM
*   **Migrations:** Alembic
*   **Caching & Queues:** Redis

### Infrastructure & Operations
*   **Environment:** Docker & Docker Compose
*   **CI/CD:** GitHub Actions (Automated Build & Test)

---

## ✨ Key Features & Architectural Highlights

*   **Role-Based Access Control (RBAC):** Secure isolation between the Customer Portal and the Admin Dashboard, with conditional rendering and route protection.
*   **End-to-End Payment Integration:** Fully integrated Razorpay payment gateway handling checkout sessions, automated webhooks, and secure order state transitions (Pending -> Processing -> Shipped).
*   **Historical Data Integrity:** Implements a strict Snapshot Strategy. Product names, SKUs, and unit prices are duplicated into the `order_items` table at the time of purchase to ensure historical financial accuracy against future catalog changes.
*   **Admin Metrics Engine:** A high-performance dashboard utilizing typed SQLAlchemy 2.x queries to instantly aggregate total revenue, active catalog counts, and recent order statuses.
*   **Enterprise Asset Pipeline:** Serves custom vector SVG imagery for all seeded catalog items via a mounted static asset pipeline within FastAPI.
*   **Robust Data Serialization:** Complex form handling, including precise Shipping Address serialization directly to the order processing endpoints.

---

## 🧪 Testing & Quality Assurance

The platform maintains exceptionally high testing standards, enforced via an automated CI pipeline.

*   **Backend (PyTest):** 88% Overall Test Coverage
*   **Frontend (Karma/Jasmine):** ~87% Line Coverage / ~68% Branch Coverage
*   **Pipeline Status:** Passing / Green

---

## 🚀 Local Development

The local development environment perfectly mirrors the production container topology to eliminate "works on my machine" bottlenecks.

1.  Clone the repository.
2.  Ensure Docker and Docker Compose are installed.
3.  Run the application stack:
    ```bash
    docker-compose up --build
    ```
4.  The Alembic migration chain is linearized. On first boot, the system will automatically run migrations and seed the database with admin users, roles, and 30 custom catalog products.

---

## 🗺 Roadmap to Production

With Feature Freeze enacted for the Milestone 1 release, upcoming sprints will focus strictly on production deployment and non-blocking optimizations:

*   **Infrastructure Provisioning:** Deploying containerized services to a managed cloud environment (AWS/GCP).
*   **Pipeline Extension:** Integrating Continuous Deployment (CD) workflows into GitHub Actions for automated registry pushes.
*   **Tooling Optimization:** Implementing ESLint, Prettier, and Husky for automated code quality enforcement.
*   **Performance & A11y:** Resolving minor bundle/SCSS budget warnings and enhancing keyboard-only accessibility markers.
