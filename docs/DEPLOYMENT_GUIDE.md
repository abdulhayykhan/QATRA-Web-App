# 🚀 QATRA Production Deployment & DevOps Playbook

### *Comprehensive Guide for Vercel Serverless, Supabase, Firebase, and CI/CD Automation*

---

## 📑 Table of Contents

- [1. Overview & Architecture Requirements](#1-overview--architecture-requirements)
- [2. Cloud Infrastructure Providers](#2-cloud-infrastructure-providers)
- [3. Environment Variables Reference](#3-environment-variables-reference)
- [4. Supabase PostgreSQL Database Setup](#4-supabase-postgresql-database-setup)
- [5. Firebase Authentication Configuration](#5-firebase-authentication-configuration)
- [6. Vercel Serverless Deployment](#6-vercel-serverless-deployment)
  - [Automated GitHub Integration (Recommended)](#automated-github-integration-recommended)
  - [Manual Vercel CLI Deployment](#manual-vercel-cli-deployment)
  - [Vercel Routing & Configuration (`vercel.json`)](#vercel-routing--configuration-verceljson)
- [7. GitHub Actions CI/CD Pipeline](#7-github-actions-cicd-pipeline)
- [8. Production Health Verification & Monitoring](#8-production-health-verification--monitoring)
- [9. Troubleshooting & Diagnostics](#9-troubleshooting--diagnostics)

---

## 1. Overview & Architecture Requirements

QATRA is designed to run with extreme cost-efficiency and zero server maintenance overhead by leveraging:
- **Vercel Global Edge Network**: Delivers pre-cached static HTML, CSS, JavaScript, and media assets in $< 50\text{ ms}$.
- **Vercel Python Serverless Runtime**: Executes FastAPI dynamically on AWS Lambda with automatic horizontal scaling from 0 to thousands of concurrent emergency requests.
- **Supabase PostgreSQL 15**: Provides reliable relational data storage with connection pooling.
- **Firebase Authentication**: Handles Google OAuth 2.0 token validation securely on the client and backend.

---

## 2. Cloud Infrastructure Providers

| Component | Provider | Tier / Configuration |
| :--- | :--- | :--- |
| **Frontend & Serverless API** | [Vercel](https://vercel.com/) | Hobby / Pro (Python 3.12, Edge CDN) |
| **Relational Database** | [Supabase](https://supabase.com/) | Free / Pro Managed PostgreSQL 15 |
| **Identity Provider** | [Google Firebase](https://firebase.google.com/) | Free Spark Tier (Google Sign-In) |
| **Continuous Integration** | [GitHub Actions](https://github.com/features/actions) | Free Ubuntu Runners |
| **OCR Document Engine** | [OCR.space](https://ocr.space/) | Free Tier (500 requests/day) / Local Vision |

---

## 3. Environment Variables Reference

Configure these variables in your Vercel Project Settings or local `.env` file:

```ini
# ==============================================================================
# Application & Core Settings
# ==============================================================================
ENVIRONMENT="production"
DEBUG="False"
PROJECT_NAME="QATRA Emergency Blood Response Platform"
VERSION="1.0.0"

# ==============================================================================
# Security & Cryptography (Required)
# ==============================================================================
# Generate with: openssl rand -hex 32
SECRET_KEY="your-hex-32-byte-secret-key"

# Generate with: python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
ENCRYPTION_KEY_AES256="your-base64-32-byte-aes-key"

# ==============================================================================
# Database (Supabase PostgreSQL)
# ==============================================================================
# Format: postgresql+psycopg://postgres:[PASSWORD]@[HOST]:5432/postgres
DATABASE_URL="postgresql+psycopg://postgres:your-db-password@db.your-supabase-id.supabase.co:5432/postgres"

# Supabase API credentials
SUPABASE_URL="https://your-supabase-id.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ==============================================================================
# Authentication & External APIs
# ==============================================================================
FIREBASE_PROJECT_ID="qatra-web-app"
OCR_SPACE_API_KEY="your-ocr-space-api-key"
```

---

## 4. Supabase PostgreSQL Database Setup

1. Create a new project at [supabase.com](https://supabase.com/).
2. Navigate to **Project Settings** $\rightarrow$ **Database**.
3. Under **Connection String**, select **URI** and copy the Postgres connection string.
4. Replace the protocol prefix `postgresql://` with `postgresql+psycopg://` to use the high-performance Psycopg 3 binary driver.
5. In the **SQL Editor**, execute the database initialization schema or rely on FastAPI's automatic SQLAlchemy lifespan table creation (`Base.metadata.create_all`).
6. Enable SSL connection mode (enforced by default on Supabase).

---

## 5. Firebase Authentication Configuration

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Navigate to **Authentication** $\rightarrow$ **Sign-in method** and enable **Google**.
3. Add your Vercel production domain to **Authorized Domains**:
   - `qatra-web-app.vercel.app`
   - `localhost`
4. In `public/static/js/firebase-config.js`, verify that your web credentials match your Firebase Console:
   ```javascript
   export const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "qatra-web-app.firebaseapp.com",
     projectId: "qatra-web-app",
     storageBucket: "qatra-web-app.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

---

## 6. Vercel Serverless Deployment

### Automated GitHub Integration (Recommended)
1. Link your GitHub repository `abdulhayykhan/QATRA-Web-App` to Vercel.
2. In the Vercel Dashboard under **Project Settings**:
   - **Framework Preset**: *Other*
   - **Root Directory**: `.` (leave blank or select repository root)
   - **Environment Variables**: Add all variables defined in Section 3 above.
3. Every push to `main` triggers a production deployment. Every pull request receives an isolated preview deployment.

### Manual Vercel CLI Deployment
```bash
# Log in to Vercel CLI
vercel login

# Link the project
vercel link

# Pull environment configuration
vercel pull --yes

# Build local serverless artifact
vercel build --prod

# Deploy build output to production
vercel deploy --prebuilt --prod
```

### Vercel Routing & Configuration (`vercel.json`)
The application relies on `vercel.json` to instruct Vercel on building both the Python serverless function and static assets:

```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python",
      "config": {
        "includeFiles": ["backend/**"]
      }
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.py"
    },
    {
      "src": "/sw.js",
      "headers": {
        "Service-Worker-Allowed": "/",
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      "dest": "/public/sw.js"
    },
    {
      "src": "/manifest.json",
      "headers": {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600"
      },
      "dest": "/public/manifest.json"
    },
    {
      "src": "/favicon.ico",
      "headers": {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400"
      },
      "dest": "/public/favicon.ico"
    },
    {
      "src": "/static/js/(.*)",
      "headers": {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      "dest": "/public/static/js/$1"
    },
    {
      "src": "/static/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400"
      },
      "dest": "/public/static/$1"
    },
    {
      "src": "/media/(.*)",
      "headers": {
        "Cache-Control": "public, max-age=86400"
      },
      "dest": "/public/media/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

### Serverless Functions Storage Quota Management
Vercel accounts have a 10 GB quota for compiled serverless functions across all retained historical deployments. To maintain account health and avoid exceeding function storage quotas:
1. **Audit Deployments**:
   ```bash
   vercel api "/v6/deployments?projectId=prj_3JFIp8OwA0UI9C13uRLT7pb0lOb3&limit=50"
   ```
2. **Prune Obsolete Builds**:
   Remove historical preview or superseded builds while strictly protecting active production:
   ```bash
   vercel rm <deployment_id_1> <deployment_id_2> --yes
   ```
   *Note: Vercel updates the dashboard storage usage bar during its next asynchronous billing sync cycle.*

---

## 7. GitHub Actions CI/CD Pipeline

The repository includes an automated pipeline in `.github/workflows/ci.yml`:

```yaml
name: QATRA CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Code Quality & Lint Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install ruff
      - run: ruff check backend/app

  test:
    name: Backend Test Suite (Pytest)
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: "sqlite:///:memory:"
      ENVIRONMENT: "testing"
      SECRET_KEY: "test-secret-key-at-least-32-chars-long"
      ENCRYPTION_KEY_AES256: "dGVzdC1hZXMtMjU2LWtleS0zMmJ5dGVzLWxvbmc="
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests -v
```

---

## 8. Production Health Verification & Monitoring

To verify system health after deployment, query the live health check endpoint:

```bash
curl -i https://qatra-web-app.vercel.app/api/health
```

### Expected Response (`200 OK`)
```json
{
  "status": "healthy",
  "app": "QATRA Emergency Blood Response Platform",
  "version": "1.0.0",
  "environment": "production",
  "fallback_mode": false,
  "dependencies": {
    "database": { "status": "connected", "type": "Supabase PostgreSQL" },
    "cache": { "status": "operational", "active_keys": 0, "hit_ratio": 0.0 },
    "storage": { "status": "configured", "provider": "Supabase Storage Vault" }
  }
}
```

*Note: If the database is unreachable, status will report `"degraded"`, `fallback_mode: true`, and still return `200 OK` to ensure the application shell remains functional.*

---

## 9. Troubleshooting & Diagnostics

#### 1. "Could not find a top-level app, application, or handler in api/index.py"
- **Cause**: Vercel’s AST scanner requires a module-level assignment (`app = None` or `app = FastAPI(...)`).
- **Fix**: Ensure `app = None` is declared at the top level of `api/index.py` before any try/except blocks.

#### 2. "ModuleNotFoundError: No module named 'app'"
- **Cause**: Vercel did not bundle the `backend/` directory into the AWS Lambda container.
- **Fix**: Verify `vercel.json` includes `"includeFiles": ["backend/**"]` in the `@vercel/python` build step.

#### 3. Service Worker Scope Error (HTTP 404 or Scope Disallowed)
- **Cause**: The service worker was served from a subdirectory or lacked the `Service-Worker-Allowed` header.
- **Fix**: Ensure `/sw.js` is mapped to root in `vercel.json` with header `"Service-Worker-Allowed": "/"`.

#### 4. "429 Too Many Requests" during testing
- **Cause**: Pytest executed rapid requests hitting the `RateLimitMiddleware`.
- **Fix**: Ensure `tests/conftest.py` has the autouse fixture calling `limiter.clear()`.

---

<div align="center">
  <b>QATRA DevOps Playbook</b><br>
  <i>Maintained by Abdul Hayy Khan and the QATRA Engineering Team.</i>
</div>
