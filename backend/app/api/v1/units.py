from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.unit import UnitCreate, UnitRead, UnitUpdate
from app.services import unit_service
from app.services.unit_service import DepartmentKindError, DepartmentNotFoundError

router = APIRouter(prefix="/units", tags=["units"])


@router.post("", response_model=UnitRead, status_code=status.HTTP_201_CREATED)
async def create_unit(payload: UnitCreate, session: AsyncSession = Depends(get_session)) -> UnitRead:
    try:
        entity, unit = await unit_service.create_unit(session, payload)
    except DepartmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Департамент не найден") from exc
    except DepartmentKindError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return unit_service.to_unit_read(entity, unit)


@router.get("", response_model=list[UnitRead])
async def list_units(session: AsyncSession = Depends(get_session)) -> list[UnitRead]:
    rows = await unit_service.list_units(session)
    return [unit_service.to_unit_read(entity, unit) for entity, unit in rows]


@router.get("/{unit_id}", response_model=UnitRead)
async def get_unit(unit_id: str, session: AsyncSession = Depends(get_session)) -> UnitRead:
    row = await unit_service.get_unit(session, unit_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден")
    entity, unit = row
    return unit_service.to_unit_read(entity, unit)


@router.patch("/{unit_id}", response_model=UnitRead)
async def patch_unit(unit_id: str, payload: UnitUpdate, session: AsyncSession = Depends(get_session)) -> UnitRead:
    try:
        result = await unit_service.patch_unit(session, unit_id, payload)
    except DepartmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Департамент не найден") from exc
    except DepartmentKindError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден")
    entity, unit = result
    return unit_service.to_unit_read(entity, unit)


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(unit_id: str, session: AsyncSession = Depends(get_session)) -> None:
    deleted = await unit_service.delete_unit(session, unit_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден")
