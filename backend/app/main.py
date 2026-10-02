import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine, Base, SessionLocal
import app.models  # ensure all models (Business, MasterApproval, BusinessApproval, MasterDocument, ApprovalRequiredDocument, VaultDocument) are loaded
from app.db.seeds import seed_all

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables if not existing in PostgreSQL / Supabase
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f" Note on table check: {e}")
    # Seed standard Indian regulatory master approvals & document mappings
    db = SessionLocal()
    try:
        seed_all(db)
        print(" Successfully seeded master approvals and regulatory document checklists.")
    except Exception as e:
        print(f" Warning: Failed to seed master approvals/documents on startup: {e}")
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for NiyamSetu — National Regulatory Compliance & Approval Engine",
    version="2.0.0",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "healthy",
        "app": "NiyamSetu API",
        "tagline": "Your Business Approval & Compliance Navigator",
        "version": "1.2.0",
        "feature": "Step 3: Document Vault & Compliance Readiness Score",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
