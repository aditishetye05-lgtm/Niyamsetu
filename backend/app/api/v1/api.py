from fastapi import APIRouter
from app.api.v1.endpoints import business, roadmap

api_router = APIRouter()
api_router.include_router(business.router, prefix="/business", tags=["Business"])
api_router.include_router(roadmap.router, prefix="/business", tags=["Roadmap"])
