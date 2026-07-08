from fastapi import APIRouter

from app.api.v1.decisions import router as decisions_router
from app.api.v1.goals import router as goals_router

api_router = APIRouter()
api_router.include_router(decisions_router)
api_router.include_router(goals_router)
