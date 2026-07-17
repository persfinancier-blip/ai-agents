from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal, GoalLifecycleStage
from app.models.kpi import Kpi
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch, GoalRead
from app.services import kpi_factor_service, kpi_service, unit_group_service, unit_service

KpiRow = tuple[Entity, Kpi]
GoalRow = tuple[Entity, Goal]


class GoalParentNotFoundError(Exception):
    """Raised when create/patch references a parent_id that isn't an existing goal."""


class GoalCycleError(Exception):
    """Raised when a parent_id change would make a goal its own ancestor."""


class GoalKpiNotFoundError(Exception):
    """Raised when a patch's kpis list references an id that isn't one of the goal's KPIs."""


class GoalUnitNotFoundError(Exception):
    """Raised when create/patch references a unit_id that isn't an existing unit or group."""


class GoalOwnerInvalidError(Exception):
    """Raised when unit_id references an existing entity that is neither a Unit nor a UnitGroup (ADR-0007)."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _validate_owner(session: AsyncSession, unit_id: str | None) -> None:
    """A goal's owner is any workforce Entity — atomic unit OR group (ADR-0007 §3).

    Nonexistent id -> 404 (GoalUnitNotFoundError); existing but wrong entity type -> 422
    (GoalOwnerInvalidError).
    """
    if unit_id is None:
        return
    if await unit_service.get_unit(session, unit_id) is not None:
        return
    if await unit_group_service.get_unit_group(session, unit_id) is not None:
        return

    entity_result = await session.execute(select(Entity).where(Entity.id == unit_id))
    if entity_result.scalars().one_or_none() is None:
        raise GoalUnitNotFoundError(f"Unit or group {unit_id} does not exist")
    raise GoalOwnerInvalidError(f"Entity {unit_id} is not a Unit or UnitGroup")


def compute_definiteness(unit_id: str | None, kpi_measurable: list[bool]) -> str:
    """ "defined" needs an assigned unit (ADR-0006) and at least one measurable KPI.

    "Measurable" means a numeric target OR (Step 3b) composite — value comes from a weighted
    sum of factor KPIs instead of a direct target; the caller (to_goal_read) precomputes this
    per KPI. No bottom-up aggregation from children — a parent's definiteness depends only on
    its own KPIs, same as a leaf.
    """
    return "defined" if unit_id is not None and any(kpi_measurable) else "fog"


async def to_goal_read(session: AsyncSession, entity: Entity, goal: Goal, kpi_rows: list[KpiRow]) -> GoalRead:
    composite_ids = await kpi_factor_service.composite_kpi_ids(
        session, [kpi_entity.id for kpi_entity, _kpi in kpi_rows]
    )

    kpis: list[GoalKpi] = []
    measurable: list[bool] = []
    for kpi_entity, kpi in kpi_rows:
        is_composite = kpi_entity.id in composite_ids
        computed_value = await kpi_factor_service.compute_value(session, kpi_entity.id) if is_composite else None
        measurable.append(kpi.target is not None or is_composite)
        kpis.append(
            GoalKpi(
                id=kpi_entity.id, name=kpi_entity.name, target=kpi.target, unit=kpi.unit, computed_value=computed_value
            )
        )

    unit_name = None
    if goal.unit_id is not None:
        unit_row = await unit_service.get_unit(session, goal.unit_id)
        if unit_row is not None:
            unit_name = unit_row[0].name
        else:
            group_row = await unit_group_service.get_unit_group(session, goal.unit_id)
            unit_name = group_row[0].name if group_row is not None else None

    return GoalRead(
        id=entity.id,
        entity_type=entity.entity_type,
        name=entity.name,
        description=entity.description,
        unit_id=goal.unit_id,
        unit_name=unit_name,
        status=entity.status,
        lifecycle_stage=entity.lifecycle_stage,
        risk_level=entity.risk_level,
        role_label=goal.role_label,
        kpis=kpis,
        is_backlog=goal.is_backlog,
        definiteness=compute_definiteness(goal.unit_id, measurable),
        parent_id=goal.parent_id,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_goal(session: AsyncSession, payload: GoalCreate) -> tuple[Entity, Goal, list[KpiRow]]:
    if payload.parent_id is not None and await _get_row(session, payload.parent_id) is None:
        raise GoalParentNotFoundError(f"Parent goal {payload.parent_id} does not exist")
    await _validate_owner(session, payload.unit_id)

    entity = Entity(
        entity_type="goal",
        name=payload.name,
        description=payload.description,
        owner="",
        status="draft",
        lifecycle_stage=GoalLifecycleStage.DRAFT.value,
    )
    session.add(entity)
    await session.flush()  # populate entity.id

    goal = Goal(
        entity_id=entity.id, role_label=payload.role_label.value, parent_id=payload.parent_id, unit_id=payload.unit_id
    )
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


async def sync_kpis(session: AsyncSession, goal_id: str, incoming: list[GoalKpi]) -> None:
    """Diff-sync instead of replace-all, so unchanged KPIs keep their entity_id (ADR-0004 R2:
    once KPIs carry alignment links in Step 3a, replace-all would silently kill those links).
    """
    current_rows = await kpi_service.list_kpis_for_goal(session, goal_id)
    current_ids = {kpi_entity.id for kpi_entity, _kpi in current_rows}

    incoming_ids = {k.id for k in incoming if k.id is not None}
    unknown_ids = incoming_ids - current_ids
    if unknown_ids:
        raise GoalKpiNotFoundError(f"KPI(s) {sorted(unknown_ids)} do not belong to goal {goal_id}")

    for kpi_id in current_ids - incoming_ids:
        await kpi_service.delete_kpi(session, kpi_id)

    for k in incoming:
        if k.id is not None:
            await kpi_service.update_kpi(session, k.id, name=k.name, target=k.target, unit=k.unit)
        else:
            await kpi_service.create_kpi(session, goal_id=goal_id, name=k.name, target=k.target, unit=k.unit)


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

    if "unit_id" in updates:
        new_unit_id = updates["unit_id"]
        await _validate_owner(session, new_unit_id)
        goal.unit_id = new_unit_id

    entity_fields = {"name", "description"}
    for field, value in updates.items():
        if field in ("parent_id", "unit_id", "kpis"):
            continue  # handled separately (parent_id/unit_id above, kpis diff-sync below)
        if field in entity_fields:
            setattr(entity, field, value)
        elif field == "role_label" and value is not None:
            goal.role_label = value.value if hasattr(value, "value") else value
        else:
            setattr(goal, field, value)

    if payload.kpis is not None:
        await sync_kpis(session, goal_id, payload.kpis)

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
