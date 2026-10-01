from fastapi import APIRouter
from app.api.v1.endpoints import business, roadmap, documents, dependency, tracker, agent

api_router = APIRouter()
api_router.include_router(business.router, prefix="/business", tags=["Business"])
api_router.include_router(roadmap.router, prefix="/business", tags=["Roadmap"])
api_router.include_router(documents.router, prefix="/business", tags=["Documents & Vault"])
api_router.include_router(dependency.router, prefix="/business", tags=["Dependency Map"])
api_router.include_router(tracker.router, prefix="/business", tags=["Tracker & Alerts"])
api_router.include_router(agent.router, prefix="/business", tags=["AI Guidance Copilot"])
