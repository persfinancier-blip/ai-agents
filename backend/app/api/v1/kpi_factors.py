from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.kpi_factor import KpiFactorCreate, KpiFactorRead
from app.services import kpi_factor_service
from app.services.kpi_factor_service import (
    DuplicateFactorError,
    FactorNotMeasurableError,
    KpiNotFoundError,
    SelfFactorError,
)

router = APIRouter(prefix="/kpi-factors", tags=["kpi-factors"])


@router.post("", response_model=KpiFactorRead, status_code=status.HTTP_201_CREATED)
async def create_factor(payload: KpiFactorCreate, session: AsyncSession = Depends(get_session)) -> KpiFactorRead:
    try:
        factor = await kpi_factor_service.create_factor(
            session, payload.composite_kpi_id, payload.factor_kpi_id, payload.weight
        )
    except (KpiNotFoundError, SelfFactorError, FactorNotMeasurableError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except DuplicateFactorError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return kpi_factor_service.to_kpi_factor_read(factor)


@router.get("", response_model=list[KpiFactorRead])
async def list_factors(composite_kpi_id: str, session: AsyncSession = Depends(get_session)) -> list[KpiFactorRead]:
    factors = await kpi_factor_service.list_factors_for_composite(session, composite_kpi_id)
    return [kpi_factor_service.to_kpi_factor_read(f) for f in factors]


@router.delete("/{factor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factor(factor_id: str, session: AsyncSession = Depends(get_session)) -> None:
    deleted = await kpi_factor_service.delete_factor(session, factor_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI factor not found")
