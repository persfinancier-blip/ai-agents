from fastapi import APIRouter

from app.api.v1.decisions import router as decisions_router
from app.api.v1.goals import router as goals_router
from app.api.v1.kpi_factors import router as kpi_factors_router
from app.api.v1.kpi_links import router as kpi_links_router
from app.api.v1.unit_groups import router as unit_groups_router
from app.api.v1.units import router as units_router

api_router = APIRouter()
api_router.include_router(decisions_router)
api_router.include_router(goals_router)
api_router.include_router(kpi_links_router)
api_router.include_router(kpi_factors_router)
api_router.include_router(units_router)
api_router.include_router(unit_groups_router)
