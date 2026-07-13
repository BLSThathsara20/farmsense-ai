# FarmSense AI

Intelligent crop planning for smallholder farmers — soil readings, ML crop suitability, market signals, and district oversupply awareness in one app.

**Northumbria University** — LD6053 Undergraduate Project  
Student: **25055042**

---

## Architecture

```
farmsense-ai/
├── frontend/          React + Vite + Tailwind (SPA → http://localhost:5173)
├── backend/           FastAPI + JWT auth + ML inference (→ http://localhost:8000)
├── database/          PostgreSQL schema (init.sql)
├── ml-models/         Trained artifacts (Random Forest suitability, ranking, …)
└── docker-compose.yml Postgres + API containers
```

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind, Zustand, React Router, Recharts, Framer Motion |
| Backend | FastAPI, SQLAlchemy, JWT, bcrypt, SlowAPI rate limits |
| Database | PostgreSQL 16 |
| ML | scikit-learn Random Forest (`rf_suitability.pkl`) |
| Email | Resend (free tier) for forgot-password |

Frontend talks to the backend when `VITE_USE_MOCK_API=false` (default in `.env.example`).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for DB + API)
- [Node.js 18+](https://nodejs.org/) (for frontend)
- Optional: Python 3.12+ if you run the API outside Docker

---

## Quick start (recommended)

### 1. Start database + backend (Docker)

```bash
cd farmsense-ai
docker compose up -d --build
```

This starts:

| Service | Host port | URL |
|---------|-----------|-----|
| PostgreSQL | **5433** | `localhost:5433` |
| FastAPI | **8000** | http://localhost:8000 |

Check health:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/ready
# → {"status":"ready","database":true,"ml_model":true}
```

API docs: http://localhost:8000/docs

### 2. Start frontend (connected to live API)

```bash
cd frontend
cp .env.example .env    # if you don't already have .env
npm install
npm run dev
```

Open **http://localhost:5173**

Confirm in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false
```

### 3. Try the full flow

1. **Register** a new account  
2. **Plan** → submit soil (N, P, K, pH)  
3. View **Recommendations** / **Dashboard**  
4. **Settings** → System status (API, DB, ML) + Saved data counts  
5. Sign out → sign in again → data is still there (PostgreSQL)

---

## Environment files

### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false
VITE_MOCK_DELAY=600
```

Set `VITE_USE_MOCK_API=true` only if you want UI demos **without** Docker.

### Backend — `backend/.env` (local uvicorn only)

When using **Docker Compose**, most vars are set in `docker-compose.yml`.  
For local API without Docker, copy `backend/.env.example`:

```env
DATABASE_URL=postgresql+psycopg://postgres:farmsense@localhost:5433/farmsense
JWT_SECRET=farmsense-dev-secret-change-in-production
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=
EMAIL_FROM=FarmSense AI <onboarding@resend.dev>
```

**Forgot password emails:** create a free key at [resend.com](https://resend.com), set `RESEND_API_KEY`, then:

```bash
docker compose up -d --build backend
```

Without a key, development still shows a **reset link on the page** so you can test the flow.

---

## Useful Docker commands

```bash
# Start
docker compose up -d --build

# Status
docker compose ps

# API logs
docker compose logs -f backend

# Rebuild API after code changes
docker compose up -d --build backend

# Stop
docker compose down

# Stop + wipe database volume (fresh DB)
docker compose down -v
```

---

## Backend without Docker (optional)

Requires Postgres already running (e.g. only `db` from compose):

```bash
docker compose up -d db

cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

---

## Main API routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | No | Liveness |
| GET | `/health/ready` | No | DB + ML ready |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | JWT login |
| POST | `/auth/forgot-password` | No | Email / reset link |
| POST | `/auth/reset-password` | No | Set new password |
| GET | `/auth/me` | Yes | Profile + saved counts |
| POST | `/soil` | Yes | Save soil + run ML |
| GET | `/dashboard` | Yes | Farmer dashboard |
| GET | `/recommendations` | Yes | Latest crop plan |
| GET | `/market` | No | Market snapshot |
| GET | `/community` | Yes | District aggregates |

---

## Frontend scripts

```bash
cd frontend
npm run dev       # http://localhost:5173
npm run build     # production build
npm run preview   # preview build
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend shows mock / empty data | Set `VITE_USE_MOCK_API=false`, restart `npm run dev` |
| `/auth/me` 404 | Rebuild API: `docker compose up -d --build backend` |
| Port 5432 in use | Compose uses **5433** on purpose |
| Login “No account found” | Register that email first |
| ML not ready | Ensure `ml-models/artifacts/rf_suitability.pkl` exists and is mounted |
| CORS errors | Backend `CORS_ORIGINS` must include `http://localhost:5173` |

---

## License

University project — Northumbria University (LD6053).
