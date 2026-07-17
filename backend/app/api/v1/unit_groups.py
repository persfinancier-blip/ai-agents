from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.unit_group import UnitGroupCreate, UnitGroupRead, UnitGroupUpdate
from app.services import unit_group_service
from app.services.unit_group_service import (
    UnitGroupCycleError,
    UnitGroupNotTeamError,
    UnitGroupParentKindError,
    UnitGroupParentNotFoundError,
    UnitNotFoundError,
)

router = APIRouter(prefix="/unit-groups", tags=["unit-groups"])


@router.post("", response_model=UnitGroupRead, status_code=status.HTTP_201_CREATED)
async def create_unit_group(payload: UnitGroupCreate, session: AsyncSession = Depends(get_session)) -> UnitGroupRead:
    try:
        entity, group = await unit_group_service.create_unit_group(session, payload)
    except UnitGroupParentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родительский департамент не найден") from exc
    except UnitGroupParentKindError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return unit_group_service.to_unit_group_read(entity, group)


@router.get("", response_model=list[UnitGroupRead])
async def list_unit_groups(session: AsyncSession = Depends(get_session)) -> list[UnitGroupRead]:
    rows = await unit_group_service.list_unit_groups(session)
    return [unit_group_service.to_unit_group_read(entity, group) for entity, group in rows]


@router.get("/{group_id}", response_model=UnitGroupRead)
async def get_unit_group(group_id: str, session: AsyncSession = Depends(get_session)) -> UnitGroupRead:
    row = await unit_group_service.get_unit_group(session, group_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    entity, group = row
    return unit_group_service.to_unit_group_read(entity, group)


@router.patch("/{group_id}", response_model=UnitGroupRead)
async def patch_unit_group(
    group_id: str, payload: UnitGroupUpdate, session: AsyncSession = Depends(get_session)
) -> UnitGroupRead:
    try:
        result = await unit_group_service.patch_unit_group(session, group_id, payload)
    except UnitGroupParentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Родительский департамент не найден") from exc
    except UnitGroupParentKindError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except UnitGroupCycleError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    entity, group = result
    return unit_group_service.to_unit_group_read(entity, group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit_group(group_id: str, session: AsyncSession = Depends(get_session)) -> None:
    deleted = await unit_group_service.delete_unit_group(session, group_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")


@router.post("/{team_id}/members/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_team_member(team_id: str, unit_id: str, session: AsyncSession = Depends(get_session)) -> None:
    try:
        await unit_group_service.add_team_member(session, team_id, unit_id)
    except UnitGroupParentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена") from exc
    except UnitNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден") from exc
    except UnitGroupNotTeamError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/{team_id}/members/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(team_id: str, unit_id: str, session: AsyncSession = Depends(get_session)) -> None:
    removed = await unit_group_service.remove_team_member(session, team_id, unit_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Членство не найдено")


@router.get("/{team_id}/members", response_model=list[str])
async def list_team_members(team_id: str, session: AsyncSession = Depends(get_session)) -> list[str]:
    row = await unit_group_service.get_unit_group(session, team_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    return await unit_group_service.list_team_members(session, team_id)
