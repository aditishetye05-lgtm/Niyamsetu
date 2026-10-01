from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import engine, Base, SessionLocal
import app.models  # ensure all models (Business, MasterApproval, BusinessApproval) are loaded
from app.db.seeds import seed_master_approvals


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables if not existing in PostgreSQL / Supabase
    Base.metadata.create_all(bind=engine)
    # Seed standard Indian regulatory master approvals
    db = SessionLocal()
    try:
        count = seed_master_approvals(db)
        if count > 0:
            print(f" Successfully seeded {count} master approvals.")
    except Exception as e:
        print(f" Warning: Failed to seed master approvals on startup: {e}")
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for NiyamSetu - Business Approval & Compliance Navigator (Smart India Hackathon)",
    version="1.1.0",
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
        "version": "1.1.0",
        "feature": "Step 2: Approval Roadmap & Discovery Engine",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
