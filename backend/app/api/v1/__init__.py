from fastapi import APIRouter

from app.api.v1.decisions import router as decisions_router

api_router = APIRouter()
api_router.include_router(decisions_router)
