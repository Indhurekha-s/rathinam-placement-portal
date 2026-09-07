# Rathinam Placement Portal - Vercel Deployment Guide

This full-stack application is pre-configured for seamless single-repository deployment on **Vercel** with a **PostgreSQL** production database (Vercel Postgres, Neon, Supabase, AWS RDS, Railway, etc.).

---

## 🚀 Quick Deployment to Vercel (3 Steps)

### Step 1: Push Code to GitHub / Git
Initialize and push this project directory to a GitHub/GitLab repository:
```bash
git init
git add .
git commit -m "feat: complete Rathinam Placement Portal ready for Vercel"
git remote add origin https://github.com/your-username/rathinam-placement-portal.git
git push -u origin main
```

### Step 2: Import Project in Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project** and select your repository.
3. Configure the project settings:
   - **Framework Preset**: `Services` (or automatically detected from `vercel.json`)
   - **Root Directory**: `./` (leave as project root)
   - Build and routing are fully managed by the `services` definition in `vercel.json`.

### Step 3: Configure Environment Variables
In the Vercel Project Settings > **Environment Variables**, add:

| Variable Name | Value Description | Example Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | `postgres://user:password@ep-xxx.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT auth | `rathinam-prod-secure-token-secret-key-32chars` |
| `NODE_ENV` | Environment identifier | `production` |

> **Option A - Using Vercel Postgres (Recommended):**
> You can also go to the **Storage** tab in your Vercel project, click **Create Database** > **Postgres**, and link it. Vercel will automatically inject `POSTGRES_URL` into your environment variables with zero manual copying!

> **Option B - Using Supabase / Neon / Railway:**
> Copy your project's `DATABASE_URL` connection pool string (ensure `?sslmode=require` is present at the end) into the `DATABASE_URL` variable.

Click **Deploy**!

---

## 🗄️ Automatic Database Migration & Seeding

The application features an **automated zero-config seeder**:
- On the very first request after deployment, the serverless backend automatically initializes all required PostgreSQL tables (`users`, `students`, `companies`, `placement_members`, `recruiters`, `ats_results`, `notifications`, `audit_logs`).
- If the database is fresh, it automatically loads all **100 verified student records** and **20 corporate companies** from the bundled Excel datasets.

### Optional: Manual Pre-Seeding via CLI
If you want to pre-seed your remote PostgreSQL database before clicking deploy, run this command locally:
```bash
node backend/seed_pg.js "postgres://user:password@host:5432/dbname?sslmode=require"
```
You will see:
```text
✓ Tables created successfully.
✓ Complete dataset imported into PostgreSQL successfully.
- Students in DB:  100
- Companies in DB: 20
- Users in DB:     134
✅ PostgreSQL Database is ready for production deployment on Vercel!
```

---

## 🔑 Production Demo Logins

All pre-configured accounts are active in the production database:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@rathinam.in` | `admin123` | Full system access, offer approvals, trash bin, bulk imports |
| **Placement Manager** | `manager@rathinam.in` | `manager123` | Placement metrics, drive schedules, student management |
| **Placement Member** | `member1@rathinam.in` | `member123` | JD uploads, company communications, student tracking |
| **Recruiter** | `recruiter@company.com` | `recruiter123` | View company profile and registered applicants |
| **Student** | `student@rathinam.in` | `student123` | View personal placement status and ATS score |

---

## 🏗️ Architecture Summary

```text
rathinam-placement-portal/
├── api/
│   └── index.js              # Vercel Serverless Function entrypoint (routes /api/* to Express)
├── backend/
│   ├── database.js           # Dual PostgreSQL (prod) + SQLite (local dev) adapter
│   ├── server.js             # Express API (all 28 routes fully async)
│   ├── seed_util.js          # Seeder logic (100 students + 20 companies)
│   └── seed_pg.js            # CLI tool for PostgreSQL migrations
├── dataset/
│   ├── 100_Students_List.xlsx # Source student directory (100 students)
│   └── Companies_List.xlsx   # Source partner companies (20 companies)
├── frontend/
│   ├── src/                  # React Vite SPA (Burgundy + Cream + Gold theme)
│   │   ├── config.js         # API_BASE_URL (relative /api routing)
│   │   └── pages/            # Login, Dashboard, Students, Companies, JD/ATS, Reports...
│   └── vite.config.js        # Local dev proxy for seamless /api routing
├── vercel.json               # Monorepo build, serverless bundling, & SPA rewrite rules
├── .env.example              # Environment variables template
└── DEPLOYMENT.md             # This deployment guide
```
