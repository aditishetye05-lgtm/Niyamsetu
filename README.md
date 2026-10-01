# NiyamSetu (नियमसेतु)
### Business Approval & Compliance Navigator (Smart India Hackathon)

> **"Your Bridge from Enterprise Vision to Regulatory Compliance"**

NiyamSetu is an intelligent compliance and business approval navigation platform designed to guide Indian entrepreneurs, MSMEs, and enterprises through statutory approvals, licenses, incentives, and clearances across Central and State jurisdictions.

---

## Architecture Overview

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React, TypeScript
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL (Supabase schema format) with SQLite local dev fallback

---

## Project Structure

```
niyam-setu/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # Business profile endpoints
│   │   ├── core/              # Config & settings
│   │   ├── db/                # Engine & session management
│   │   ├── models/            # SQLAlchemy models (Business)
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   └── main.py            # FastAPI main app with CORS
│   ├── supabase_schema.sql    # Supabase / PostgreSQL table DDL
│   ├── test_api.py            # Automated API integration tests
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                 # Backend development runner
│   └── .env                   # Backend environment configuration
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router (Layout & Page)
    │   ├── components/        # Business Registration Card, UI Primitives
    │   └── lib/               # Utility functions & API client
    ├── package.json
    └── tailwind.config.ts
```

---

## Getting Started

### 1. Backend Setup (FastAPI)

1. Open a terminal in `./backend`:
   ```bash
   cd backend
   ```
2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Database:
   - For **local SQLite dev** (default): No configuration needed! It automatically creates `niyamsetu.db`.
   - For **Supabase / PostgreSQL**: Edit `backend/.env` with:
     ```env
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
     ```
     You can also run `backend/supabase_schema.sql` directly inside the Supabase SQL editor.
5. Run the server:
   ```bash
   python run.py
   # Or using uvicorn directly:
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
6. API Documentation:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 2. Frontend Setup (Next.js)

1. Open a terminal in `./frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Endpoints Implemented

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/business/profile` | Register business profile and return record with UUID |
| `GET` | `/api/v1/business/{business_id}` | Retrieve business profile by ID |
| `GET` | `/api/v1/business/` | List registered businesses |
| `GET` | `/health` | Health check endpoint |
