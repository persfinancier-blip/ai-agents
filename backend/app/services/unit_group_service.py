from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal
from app.models.unit import Unit
from app.models.unit_group import TeamMembership, UnitGroup, UnitGroupKind
from app.schemas.unit_group import UnitGroupCreate, UnitGroupRead, UnitGroupUpdate

UnitGroupRow = tuple[Entity, UnitGroup]


class UnitGroupParentNotFoundError(Exception):
    """Raised when create/patch references a parent_id that isn't an existing department."""


class UnitGroupParentKindError(Exception):
    """Raised when parent_id is set on a non-department group, or points at a non-department."""


class UnitGroupCycleError(Exception):
    """Raised when a parent_id change would make a department its own ancestor."""


class UnitGroupNotTeamError(Exception):
    """Raised when membership operations target a group whose kind isn't team."""


class UnitNotFoundError(Exception):
    """Raised when a referenced unit_id doesn't exist."""


def to_unit_group_read(entity: Entity, group: UnitGroup) -> UnitGroupRead:
    return UnitGroupRead(
        entity_id=entity.id,
        name=entity.name,
        kind=group.kind,
        description=entity.description,
        parent_id=group.parent_id,
        created_at=entity.created_at,
    )


async def _get_row(session: AsyncSession, group_id: str) -> UnitGroupRow | None:
    result = await session.execute(
        select(Entity, UnitGroup).join(UnitGroup, UnitGroup.entity_id == Entity.id).where(Entity.id == group_id)
    )
    return result.tuples().one_or_none()


async def get_unit_group(session: AsyncSession, group_id: str) -> UnitGroupRow | None:
    return await _get_row(session, group_id)


async def list_unit_groups(session: AsyncSession) -> list[UnitGroupRow]:
    result = await session.execute(select(Entity, UnitGroup).join(UnitGroup, UnitGroup.entity_id == Entity.id))
    return list(result.tuples().all())


async def would_create_cycle(session: AsyncSession, group_id: str, new_parent_id: str) -> bool:
    """True if setting group_id's parent to new_parent_id makes group_id its own ancestor."""
    if new_parent_id == group_id:
        return True

    current_id: str | None = new_parent_id
    visited: set[str] = set()
    while current_id is not None:
        if current_id == group_id:
            return True
        if current_id in visited:
            break
        visited.add(current_id)
        row = await _get_row(session, current_id)
        if row is None:
            break
        _entity, ancestor = row
        current_id = ancestor.parent_id
    return False


async def _validate_parent(session: AsyncSession, kind: str, parent_id: str | None) -> None:
    if parent_id is None:
        return
    if kind != UnitGroupKind.DEPARTMENT.value:
        raise UnitGroupParentKindError("parent_id is only valid for kind=department")
    parent_row = await _get_row(session, parent_id)
    if parent_row is None:
        raise UnitGroupParentNotFoundError(f"Parent group {parent_id} does not exist")
    _parent_entity, parent_group = parent_row
    if parent_group.kind != UnitGroupKind.DEPARTMENT.value:
        raise UnitGroupParentKindError("parent_id must reference a department")


async def create_unit_group(session: AsyncSession, payload: UnitGroupCreate) -> UnitGroupRow:
    await _validate_parent(session, payload.kind.value, payload.parent_id)

    entity = Entity(
        entity_type="unit_group",
        name=payload.name,
        description=payload.description,
        owner="",
        status="active",
        lifecycle_stage="active",
    )
    session.add(entity)
    await session.flush()

    group = UnitGroup(entity_id=entity.id, kind=payload.kind.value, parent_id=payload.parent_id)
    session.add(group)
    await session.commit()
    await session.refresh(entity)
    await session.refresh(group)
    return entity, group


async def patch_unit_group(session: AsyncSession, group_id: str, payload: UnitGroupUpdate) -> UnitGroupRow | None:
    row = await _get_row(session, group_id)
    if row is None:
        return None
    entity, group = row

    updates = payload.model_dump(exclude_unset=True)

    new_kind = payload.kind.value if "kind" in updates and payload.kind is not None else group.kind

    if "parent_id" in updates:
        new_parent_id = updates["parent_id"]
        await _validate_parent(session, new_kind, new_parent_id)
        if new_parent_id is not None and await would_create_cycle(session, group_id, new_parent_id):
            raise UnitGroupCycleError(f"Setting parent to {new_parent_id} would create a cycle")
        group.parent_id = new_parent_id
    elif "kind" in updates and new_kind != UnitGroupKind.DEPARTMENT.value:
        await _validate_parent(session, new_kind, group.parent_id)

    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "kind" in updates and payload.kind is not None:
        group.kind = new_kind

    entity.version += 1

    await session.commit()
    await session.refresh(entity)
    await session.refresh(group)
    return entity, group


async def delete_unit_group(session: AsyncSession, group_id: str) -> bool:
    """Deleting a group nulls all inbound references (ADR-0007 delete rule)."""
    row = await _get_row(session, group_id)
    if row is None:
        return False
    entity, group = row

    await session.execute(update(Goal).where(Goal.unit_id == group_id).values(unit_id=None))
    await session.execute(update(Unit).where(Unit.department_id == group_id).values(department_id=None))
    await session.execute(update(UnitGroup).where(UnitGroup.parent_id == group_id).values(parent_id=None))
    result = await session.execute(select(TeamMembership).where(TeamMembership.team_id == group_id))
    for membership in result.scalars().all():
        await session.delete(membership)

    await session.delete(group)
    await session.delete(entity)
    await session.commit()
    return True


async def _get_unit_row(session: AsyncSession, unit_id: str) -> tuple[Entity, Unit] | None:
    result = await session.execute(
        select(Entity, Unit).join(Unit, Unit.entity_id == Entity.id).where(Entity.id == unit_id)
    )
    return result.tuples().one_or_none()


async def add_team_member(session: AsyncSession, team_id: str, unit_id: str) -> None:
    group_row = await _get_row(session, team_id)
    if group_row is None:
        raise UnitGroupParentNotFoundError(f"Group {team_id} does not exist")
    _entity, group = group_row
    if group.kind != UnitGroupKind.TEAM.value:
        raise UnitGroupNotTeamError("Membership is only valid for kind=team")

    if await _get_unit_row(session, unit_id) is None:
        raise UnitNotFoundError(f"Unit {unit_id} does not exist")

    existing = await session.execute(
        select(TeamMembership).where(TeamMembership.team_id == team_id, TeamMembership.unit_id == unit_id)
    )
    if existing.scalars().one_or_none() is None:
        session.add(TeamMembership(team_id=team_id, unit_id=unit_id))
        await session.commit()


async def remove_team_member(session: AsyncSession, team_id: str, unit_id: str) -> bool:
    result = await session.execute(
        select(TeamMembership).where(TeamMembership.team_id == team_id, TeamMembership.unit_id == unit_id)
    )
    membership = result.scalars().one_or_none()
    if membership is None:
        return False
    await session.delete(membership)
    await session.commit()
    return True


async def list_team_members(session: AsyncSession, team_id: str) -> list[str]:
    result = await session.execute(select(TeamMembership.unit_id).where(TeamMembership.team_id == team_id))
    return list(result.scalars().all())
