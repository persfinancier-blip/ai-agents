from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.goal import GoalCreate, GoalPatch, GoalRead
from app.services import goal_service, kpi_service
from app.services.goal_service import (
    GoalCycleError,
    GoalKpiNotFoundError,
    GoalParentNotFoundError,
    GoalUnitNotFoundError,
)

router = APIRouter(prefix="/goals", tags=["goals"])


async def _to_goal_read_list(session: AsyncSession, rows: list[goal_service.GoalRow]) -> list[GoalRead]:
    result = []
    for entity, goal in rows:
        kpi_rows = await kpi_service.list_kpis_for_goal(session, entity.id)
        result.append(await goal_service.to_goal_read(session, entity, goal, kpi_rows))
    return result


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, session: AsyncSession = Depends(get_session)) -> GoalRead:
    try:
        entity, goal, kpi_rows = await goal_service.create_goal(session, payload)
    except GoalParentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except GoalUnitNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден") from exc
    return await goal_service.to_goal_read(session, entity, goal, kpi_rows)


@router.get("", response_model=list[GoalRead])
async def list_goals(session: AsyncSession = Depends(get_session)) -> list[GoalRead]:
    rows = await goal_service.list_goals(session)
    return await _to_goal_read_list(session, rows)


@router.get("/{goal_id}", response_model=GoalRead)
async def get_goal(goal_id: str, session: AsyncSession = Depends(get_session)) -> GoalRead:
    row = await goal_service.get_goal(session, goal_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    entity, goal = row
    kpi_rows = await kpi_service.list_kpis_for_goal(session, goal_id)
    return await goal_service.to_goal_read(session, entity, goal, kpi_rows)


@router.get("/{goal_id}/subtree", response_model=list[GoalRead])
async def get_goal_subtree(goal_id: str, session: AsyncSession = Depends(get_session)) -> list[GoalRead]:
    rows = await goal_service.get_subtree(session, goal_id)
    if rows is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return await _to_goal_read_list(session, rows)


@router.patch("/{goal_id}", response_model=GoalRead)
async def patch_goal(goal_id: str, payload: GoalPatch, session: AsyncSession = Depends(get_session)) -> GoalRead:
    try:
        result = await goal_service.patch_goal(session, goal_id, payload)
    except GoalParentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except GoalKpiNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except GoalCycleError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except GoalUnitNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Юнит не найден") from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    entity, goal, kpi_rows = result
    return await goal_service.to_goal_read(session, entity, goal, kpi_rows)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: str, cascade: bool = False, session: AsyncSession = Depends(get_session)) -> None:
    outcome = await goal_service.delete_goal(session, goal_id, cascade=cascade)
    if outcome == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    if outcome == "has_children":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Goal has children; retry with ?cascade=true to delete the whole subtree",
        )
