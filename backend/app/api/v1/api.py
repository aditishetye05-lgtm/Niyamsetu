from fastapi import APIRouter
from app.api.v1.endpoints import business

api_router = APIRouter()
api_router.include_router(business.router, prefix="/business", tags=["Business"])
