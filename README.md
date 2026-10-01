# NiyamSetu (नियमसेतु)
### Business Approval & Compliance Navigator (Smart India Hackathon)

> **"Your Bridge from Enterprise Vision to Regulatory Compliance"**

NiyamSetu is an intelligent compliance and business approval navigation platform designed to guide Indian entrepreneurs, MSMEs, and enterprises through statutory approvals, licenses, incentives, and clearances across Central and State jurisdictions.

---

## Architecture Overview

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React, React Flow (@xyflow/react), Dagre, TypeScript
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL (Supabase schema format) with SQLite local dev fallback

---

## Project Structure

```
niyam-setu/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # Business, Roadmap, Documents & Dependency Map endpoints
│   │   ├── core/              # Config & settings
│   │   ├── db/                # Engine, session & seed data
│   │   ├── models/            # SQLAlchemy models (Business, MasterApproval, BusinessApproval, MasterDocument, ApprovalRequiredDocument, VaultDocument)
│   │   ├── schemas/           # Pydantic v2 schemas
│   │   ├── services/          # Discovery Engine, Compliance Score & DAG Dependency Engine
│   │   └── main.py            # FastAPI main app with CORS & lifespan seeding
│   ├── supabase_schema.sql    # Complete Supabase PostgreSQL DDL & indexes
│   ├── test_api.py            # Step 1 API tests
│   ├── test_roadmap.py        # Step 2 Discovery & Roadmap tests
│   ├── test_vault.py          # Step 3 Document Vault & Score tests
│   ├── test_dependencies.py   # Step 4 DAG Dependency Map tests
│   ├── requirements.txt       # Python dependencies
│   ├── run.py                 # Backend development runner
│   └── .env                   # Backend environment configuration
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router (/, /roadmap, /vault, /dependencies)
    │   ├── components/        # Business Registration, Header, ComplianceScoreWidget, DAGCustomNode
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
   - For **Supabase / PostgreSQL**: Edit `backend/.env` with your Supabase pooler URL:
     ```env
     DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
     ```
   - For **local SQLite dev**: Falls back to `niyamsetu.db` automatically if no PostgreSQL URL is provided.
5. Run automated tests:
   ```bash
   python test_roadmap.py
   python test_vault.py
   python test_dependencies.py
   ```
6. Run the server:
   ```bash
   python run.py
   # Or using uvicorn:
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
7. API Documentation:
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

## Features Implemented

###  Step 1: Enter Business Details
- Captures Enterprise Name, Business Type, State, Investment in INR, and Employee Count.
- Automatically calculates MSME Classification (Micro, Small, Medium).
- Persists record in Supabase PostgreSQL table `businesses`.

###  Step 2: Approval Roadmap & Regulatory Discovery Engine
- **Master Approvals Catalog**: Seeded with standard statutory Indian clearances (MCA, GST, Udyam MSME, FSSAI, Pollution Control CTE, Fire Safety NOC, Factory Licence, Shops & Establishment, Trade Licence).
- **Rule Engine**: Analyzes parameters (Industry, Capital bracket, Staff threshold) and maps required clearances.
- **Interactive Roadmap Page (`/roadmap?business_id=[id]`)**:
  - Summary metrics banner (Total Clearances, Mandatory Count, Max Timeline, MSME bracket).
  - Status management (`not_applied`, `documents_ready`, `submitted`, `under_review`, `approved`).
  - Filtering by category (Mandatory, In Progress, Approved).

###  Step 3: Document Checklist, Smart Vault & Compliance Readiness Score
- **Approval-wise Document Checklist**: Maps exact statutory documents required for each approval.
- **Smart Document Vault with Cross-Approval Reuse**: Common documents (PAN, Aadhaar, Lease Deed, Site Plan) uploaded once are automatically linked and satisfy all clearances requiring them.
- **Dynamic Compliance Readiness Score Engine (0-100%)**:
  - Weighted formula:
    - *Documents Readiness (40%)*
    - *Approvals Progress (30%)*
    - *Dependencies Met (20%)*
    - *Renewals & Validity (10%)*
  - Radial circular gauge with rating indicators (*Audit Ready*, *On Track*, *Needs Attention*).
- **Dedicated Vault Interface (`/vault?business_id=[id]`)**:
  - Clearance filter tabs with live completion fractions.
  - Interactive upload dropzone supporting real files or verified mocks.

###  Step 4: Approval Dependency Map (Directed Acyclic Graph)
- **Dependency Resolution Engine**:
  - Distinguishes **Independent** clearances (can be filed immediately: Business Registration, Fire Safety NOC) from **Dependent** clearances (e.g. FSSAI requires Business Reg; Factory Licence requires Pollution Consent & Fire NOC).
  - Evaluates real-time node execution states:
    - `CAN_APPLY_NOW` (Green): Prerequisites are met, ready to apply immediately.
    - `IN_PROGRESS` (Blue): Status is submitted or under review.
    - `COMPLETED` (Teal/Emerald): Status is approved.
    - `BLOCKED` (Amber): Dependent on preceding approvals that are not yet approved.
- **Interactive DAG Visualizer (`/dependencies?business_id=[id]`)**:
  - Built with `@xyflow/react` and `dagre` for automated hierarchical left-to-right tree layout.
  - Custom Card Nodes with document readiness percentage, status badges, and glowing pulse effects for ready nodes.
  - Side Drawer on node click displaying prerequisites, status breakdown, and direct links to official government portals.

---

## API Endpoints Implemented

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/business/profile` | Register business profile and return record with UUID |
| `GET` | `/api/v1/business/{business_id}` | Retrieve business profile by ID |
| `POST` | `/api/v1/business/{business_id}/discover-approvals` | Evaluate criteria and generate customized approval checklist |
| `GET` | `/api/v1/business/{business_id}/roadmap` | Retrieve mapped approvals with status, departments, and prerequisites |
| `PATCH` | `/api/v1/business/{business_id}/approvals/{approval_id}/status` | Update progress status of a specific clearance |
| `GET` | `/api/v1/business/{business_id}/documents` | Retrieve approval-wise documents & unique vault checklist with reuse metadata |
| `POST` | `/api/v1/business/{business_id}/documents/upload` | Upload document to vault with automated cross-approval reuse |
| `DELETE` | `/api/v1/business/{business_id}/documents/{vault_doc_id}` | Remove document from vault |
| `GET` | `/api/v1/business/{business_id}/compliance-score` | Calculate real-time Compliance Readiness Score (0-100%) & breakdown |
| `GET` | `/api/v1/business/{business_id}/dependency-map` | Compute interactive Directed Acyclic Graph (DAG) with real-time clearance eligibility |
| `GET` | `/health` | Health check endpoint |
