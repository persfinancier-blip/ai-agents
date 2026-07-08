from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal, GoalLifecycleStage
from app.models.kpi import Kpi
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch, GoalRead
from app.services import kpi_service

KpiRow = tuple[Entity, Kpi]
GoalRow = tuple[Entity, Goal]


class GoalParentNotFoundError(Exception):
    """Raised when create/patch references a parent_id that isn't an existing goal."""


class GoalCycleError(Exception):
    """Raised when a parent_id change would make a goal its own ancestor."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def compute_definiteness(owner: str, kpi_targets: list[float | None]) -> str:
    """ "defined" needs an owner and at least one KPI with a numeric, non-None target.

    Step 3 adds a third criterion ("has a resource"); not checked here since
    resources don't exist yet physically. No bottom-up aggregation from children —
    a parent's definiteness depends only on its own KPIs, same as a leaf.
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
        parent_id=goal.parent_id,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_goal(session: AsyncSession, payload: GoalCreate) -> tuple[Entity, Goal, list[KpiRow]]:
    if payload.parent_id is not None and await _get_row(session, payload.parent_id) is None:
        raise GoalParentNotFoundError(f"Parent goal {payload.parent_id} does not exist")

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

    goal = Goal(entity_id=entity.id, role_label=payload.role_label.value, parent_id=payload.parent_id)
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


async def _get_row(session: AsyncSession, goal_id: str) -> GoalRow | None:
    result = await session.execute(
        select(Entity, Goal).join(Goal, Goal.entity_id == Entity.id).where(Entity.id == goal_id)
    )
    return result.tuples().one_or_none()


async def get_goal(session: AsyncSession, goal_id: str) -> GoalRow | None:
    return await _get_row(session, goal_id)


async def list_goals(session: AsyncSession) -> list[GoalRow]:
    result = await session.execute(select(Entity, Goal).join(Goal, Goal.entity_id == Entity.id))
    return list(result.tuples().all())


async def would_create_cycle(session: AsyncSession, goal_id: str, new_parent_id: str) -> bool:
    """True if setting goal_id's parent to new_parent_id makes goal_id its own ancestor.

    Walks up from new_parent_id towards the root; hitting goal_id along the way means
    goal_id is already an ancestor of new_parent_id, so the edge would close a loop.
    """
    if new_parent_id == goal_id:
        return True

    current_id: str | None = new_parent_id
    visited: set[str] = set()
    while current_id is not None:
        if current_id == goal_id:
            return True
        if current_id in visited:
            break  # a pre-existing cycle elsewhere in the data; don't loop forever
        visited.add(current_id)
        row = await _get_row(session, current_id)
        if row is None:
            break
        _entity, ancestor_goal = row
        current_id = ancestor_goal.parent_id
    return False


async def get_subtree(session: AsyncSession, goal_id: str) -> list[GoalRow] | None:
    """All descendants of goal_id (including itself), flattened, root first (BFS order)."""
    root = await _get_row(session, goal_id)
    if root is None:
        return None

    all_rows = await list_goals(session)
    children_by_parent: dict[str | None, list[GoalRow]] = {}
    for entity, goal in all_rows:
        children_by_parent.setdefault(goal.parent_id, []).append((entity, goal))

    result = [root]
    frontier = [goal_id]
    while frontier:
        next_frontier = []
        for parent_id in frontier:
            for child_entity, child_goal in children_by_parent.get(parent_id, []):
                result.append((child_entity, child_goal))
                next_frontier.append(child_entity.id)
        frontier = next_frontier
    return result


async def delete_goal(session: AsyncSession, goal_id: str, cascade: bool) -> Literal["ok", "has_children", "not_found"]:
    subtree = await get_subtree(session, goal_id)
    if subtree is None:
        return "not_found"

    if len(subtree) > 1 and not cascade:
        return "has_children"

    # Leaves before their parents: subtree is root-first (BFS), so reversing it
    # guarantees every child is deleted before the parent it points to.
    for entity, goal in reversed(subtree):
        await kpi_service.delete_kpis_for_goal(session, entity.id)
        await session.delete(goal)
        await session.delete(entity)

    await session.commit()
    return "ok"


async def patch_goal(
    session: AsyncSession, goal_id: str, payload: GoalPatch
) -> tuple[Entity, Goal, list[KpiRow]] | None:
    row = await _get_row(session, goal_id)
    if row is None:
        return None
    entity, goal = row

    updates = payload.model_dump(exclude_unset=True)

    if "parent_id" in updates:
        new_parent_id = updates["parent_id"]
        if new_parent_id is not None:
            if await _get_row(session, new_parent_id) is None:
                raise GoalParentNotFoundError(f"Parent goal {new_parent_id} does not exist")
            if await would_create_cycle(session, goal_id, new_parent_id):
                raise GoalCycleError(f"Setting parent to {new_parent_id} would create a cycle")
        goal.parent_id = new_parent_id

    entity_fields = {"name", "description", "owner"}
    for field, value in updates.items():
        if field in ("parent_id", "kpis"):
            continue  # handled separately (parent_id above, kpis replace-all below)
        if field in entity_fields:
            setattr(entity, field, value)
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
