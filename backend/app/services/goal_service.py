from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal, GoalLifecycleStage
from app.models.kpi import Kpi
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch, GoalRead
from app.services import kpi_service

KpiRow = tuple[Entity, Kpi]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def compute_definiteness(owner: str, kpi_targets: list[float | None]) -> str:
    """ "defined" needs an owner and at least one KPI with a numeric, non-None target.

    Step 3 adds a third criterion ("has a resource"); not checked here since
    resources don't exist yet physically.
    """
    has_owner = bool(owner.strip())
    has_numeric_target = any(
        isinstance(target, (int, float)) and not isinstance(target, bool) for target in kpi_targets
    )
    return "defined" if has_owner and has_numeric_target else "fog"


def to_goal_read(entity: Entity, goal: Goal, kpi_rows: list[KpiRow]) -> GoalRead:
    kpis = [GoalKpi(name=kpi_entity.name, target=kpi.target, unit=kpi.unit) for kpi_entity, kpi in kpi_rows]
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
        kpis=kpis,
        is_backlog=goal.is_backlog,
        definiteness=compute_definiteness(entity.owner, [kpi.target for _, kpi in kpi_rows]),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_goal(session: AsyncSession, payload: GoalCreate) -> tuple[Entity, Goal, list[KpiRow]]:
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

    goal = Goal(entity_id=entity.id, role_label=payload.role_label.value)
    session.add(goal)
    await session.flush()

    kpi_rows = [
        await kpi_service.create_kpi(session, goal_id=entity.id, name=k.name, target=k.target, unit=k.unit)
        for k in payload.kpis
    ]

    await session.commit()
    await session.refresh(entity)
    await session.refresh(goal)
    for kpi_entity, kpi in kpi_rows:
        await session.refresh(kpi_entity)
        await session.refresh(kpi)
    return entity, goal, kpi_rows


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


async def patch_goal(
    session: AsyncSession, goal_id: str, payload: GoalPatch
) -> tuple[Entity, Goal, list[KpiRow]] | None:
    row = await _get_row(session, goal_id)
    if row is None:
        return None
    entity, goal = row

    updates = payload.model_dump(exclude_unset=True)
    entity_fields = {"name", "description", "owner"}
    for field, value in updates.items():
        if field in entity_fields:
            setattr(entity, field, value)
        elif field == "kpis":
            continue  # replace-all sync below, after entity/goal field updates
        elif field == "role_label" and value is not None:
            goal.role_label = value.value if hasattr(value, "value") else value
        else:
            setattr(goal, field, value)

    if payload.kpis is not None:
        # Replace-all for Step 2a; diff-based sync deferred to a later step.
        await kpi_service.delete_kpis_for_goal(session, goal_id)
        for k in payload.kpis:
            await kpi_service.create_kpi(session, goal_id=goal_id, name=k.name, target=k.target, unit=k.unit)

    entity.version += 1
    entity.updated_at = _now()

    await session.commit()
    await session.refresh(entity)
    await session.refresh(goal)
    kpi_rows = await kpi_service.list_kpis_for_goal(session, goal_id)
    for kpi_entity, kpi in kpi_rows:
        await session.refresh(kpi_entity)
        await session.refresh(kpi)
    return entity, goal, kpi_rows
