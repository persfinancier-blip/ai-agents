from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.goal import GoalCreate, GoalPatch, GoalRead
from app.services import goal_service, kpi_service

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, session: AsyncSession = Depends(get_session)) -> GoalRead:
    entity, goal, kpi_rows = await goal_service.create_goal(session, payload)
    return goal_service.to_goal_read(entity, goal, kpi_rows)


@router.get("", response_model=list[GoalRead])
async def list_goals(session: AsyncSession = Depends(get_session)) -> list[GoalRead]:
    rows = await goal_service.list_goals(session)
    result = []
    for entity, goal in rows:
        kpi_rows = await kpi_service.list_kpis_for_goal(session, entity.id)
        result.append(goal_service.to_goal_read(entity, goal, kpi_rows))
    return result


@router.get("/{goal_id}", response_model=GoalRead)
async def get_goal(goal_id: str, session: AsyncSession = Depends(get_session)) -> GoalRead:
    row = await goal_service.get_goal(session, goal_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    entity, goal = row
    kpi_rows = await kpi_service.list_kpis_for_goal(session, goal_id)
    return goal_service.to_goal_read(entity, goal, kpi_rows)


@router.patch("/{goal_id}", response_model=GoalRead)
async def patch_goal(goal_id: str, payload: GoalPatch, session: AsyncSession = Depends(get_session)) -> GoalRead:
    result = await goal_service.patch_goal(session, goal_id, payload)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    entity, goal, kpi_rows = result
    return goal_service.to_goal_read(entity, goal, kpi_rows)
