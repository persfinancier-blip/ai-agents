from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal
from app.models.unit import Unit
from app.models.unit_group import UnitGroup, UnitGroupKind
from app.schemas.unit import UnitCreate, UnitRead, UnitUpdate

UnitRow = tuple[Entity, Unit]


class DepartmentNotFoundError(Exception):
    """Raised when create/patch references a department_id that isn't an existing group."""


class DepartmentKindError(Exception):
    """Raised when department_id references a group whose kind isn't department."""


def to_unit_read(entity: Entity, unit: Unit) -> UnitRead:
    return UnitRead(
        entity_id=entity.id,
        name=entity.name,
        kind=unit.kind,
        description=entity.description,
        department_id=unit.department_id,
        created_at=entity.created_at,
    )


async def _validate_department(session: AsyncSession, department_id: str | None) -> None:
    if department_id is None:
        return
    result = await session.execute(select(UnitGroup).where(UnitGroup.entity_id == department_id))
    group = result.scalars().one_or_none()
    if group is None:
        raise DepartmentNotFoundError(f"Department {department_id} does not exist")
    if group.kind != UnitGroupKind.DEPARTMENT.value:
        raise DepartmentKindError("department_id must reference a department")


async def create_unit(session: AsyncSession, payload: UnitCreate) -> UnitRow:
    await _validate_department(session, payload.department_id)

    entity = Entity(
        entity_type="unit",
        name=payload.name,
        description=payload.description,
        owner="",
        status="active",
        lifecycle_stage="active",
    )
    session.add(entity)
    await session.flush()  # populate entity.id

    unit = Unit(entity_id=entity.id, kind=payload.kind.value, department_id=payload.department_id)
    session.add(unit)
    await session.commit()
    await session.refresh(entity)
    await session.refresh(unit)
    return entity, unit


async def _get_row(session: AsyncSession, unit_id: str) -> UnitRow | None:
    result = await session.execute(
        select(Entity, Unit).join(Unit, Unit.entity_id == Entity.id).where(Entity.id == unit_id)
    )
    return result.tuples().one_or_none()


async def get_unit(session: AsyncSession, unit_id: str) -> UnitRow | None:
    return await _get_row(session, unit_id)


async def list_units(session: AsyncSession) -> list[UnitRow]:
    result = await session.execute(select(Entity, Unit).join(Unit, Unit.entity_id == Entity.id))
    return list(result.tuples().all())


async def patch_unit(session: AsyncSession, unit_id: str, payload: UnitUpdate) -> UnitRow | None:
    row = await _get_row(session, unit_id)
    if row is None:
        return None
    entity, unit = row

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "kind" in updates and updates["kind"] is not None:
        unit.kind = payload.kind.value if payload.kind is not None else unit.kind
    if "department_id" in updates:
        await _validate_department(session, updates["department_id"])
        unit.department_id = updates["department_id"]

    entity.version += 1

    await session.commit()
    await session.refresh(entity)
    await session.refresh(unit)
    return entity, unit


async def delete_unit(session: AsyncSession, unit_id: str) -> bool:
    """Nulls out unit_id on referencing goals (no DB cascades in this project) before deleting."""
    row = await _get_row(session, unit_id)
    if row is None:
        return False
    entity, unit = row

    await session.execute(update(Goal).where(Goal.unit_id == unit_id).values(unit_id=None))
    await session.delete(unit)
    await session.delete(entity)
    await session.commit()
    return True
