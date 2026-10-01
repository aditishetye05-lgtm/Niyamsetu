from fastapi import APIRouter
from app.api.v1.endpoints import business, roadmap, documents, dependency

api_router = APIRouter()
api_router.include_router(business.router, prefix="/business", tags=["Business"])
api_router.include_router(roadmap.router, prefix="/business", tags=["Roadmap"])
api_router.include_router(documents.router, prefix="/business", tags=["Documents & Vault"])
api_router.include_router(dependency.router, prefix="/business", tags=["Dependency Map"])
