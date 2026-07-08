from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal, GoalLifecycleStage
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch, GoalRead


def _now() -> datetime:
    return datetime.now(timezone.utc)


def compute_definiteness(owner: str, kpis: list[dict]) -> str:
    """ "defined" needs an owner and a KPI with a numeric target.

    Step 3 adds a third criterion ("has a resource"); not checked here since
    resources don't exist yet physically.
    """
    has_owner = bool(owner.strip())
    has_numeric_kpi = any(
        isinstance(kpi.get("target"), (int, float)) and not isinstance(kpi.get("target"), bool) for kpi in kpis
    )
    return "defined" if has_owner and has_numeric_kpi else "fog"


def to_goal_read(entity: Entity, goal: Goal) -> GoalRead:
    return GoalRead(
        id=entity.id,
        entity_type=entity.entity_type,
        name=entity.name,
        description=entity.description,
        owner=entity.owner,
        status=entity.status,
        lifecycle_stage=entity.lifecycle_stage,
        risk_level=entity.risk_level,
        role_label=goal.role_label,
        kpis=[GoalKpi(**k) for k in goal.kpis],
        is_backlog=goal.is_backlog,
        definiteness=compute_definiteness(entity.owner, goal.kpis),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_goal(session: AsyncSession, payload: GoalCreate) -> tuple[Entity, Goal]:
    entity = Entity(
        entity_type="goal",
        name=payload.name,
        description=payload.description,
        owner=payload.owner,
        status="draft",
        lifecycle_stage=GoalLifecycleStage.DRAFT.value,
    )
    session.add(entity)
    await session.flush()  # populate entity.id

    goal = Goal(
        entity_id=entity.id,
        role_label=payload.role_label.value,
        kpis=[k.model_dump() for k in payload.kpis],
    )
    session.add(goal)
    await session.commit()
    await session.refresh(entity)
    await session.refresh(goal)
    return entity, goal


async def _get_row(session: AsyncSession, goal_id: str) -> tuple[Entity, Goal] | None:
    result = await session.execute(
        select(Entity, Goal).join(Goal, Goal.entity_id == Entity.id).where(Entity.id == goal_id)
    )
    return result.tuples().one_or_none()


async def get_goal(session: AsyncSession, goal_id: str) -> tuple[Entity, Goal] | None:
    return await _get_row(session, goal_id)


async def list_goals(session: AsyncSession) -> list[tuple[Entity, Goal]]:
    result = await session.execute(select(Entity, Goal).join(Goal, Goal.entity_id == Entity.id))
    return list(result.tuples().all())


async def patch_goal(session: AsyncSession, goal_id: str, payload: GoalPatch) -> tuple[Entity, Goal] | None:
    row = await _get_row(session, goal_id)
    if row is None:
        return None
    entity, goal = row

    updates = payload.model_dump(exclude_unset=True)
    entity_fields = {"name", "description", "owner"}
    for field, value in updates.items():
        if field in entity_fields:
            setattr(entity, field, value)
        elif field == "kpis" and value is not None:
            goal.kpis = [item.model_dump() if hasattr(item, "model_dump") else item for item in value]
        elif field == "role_label" and value is not None:
            goal.role_label = value.value if hasattr(value, "value") else value
        else:
            setattr(goal, field, value)

    entity.version += 1
    entity.updated_at = _now()

    await session.commit()
    await session.refresh(entity)
    await session.refresh(goal)
    return entity, goal
