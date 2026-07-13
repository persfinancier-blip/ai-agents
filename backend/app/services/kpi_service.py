from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.kpi import Kpi
from app.schemas.kpi import KpiRead
from app.services import kpi_factor_service, kpi_link_service


def to_kpi_read(entity: Entity, kpi: Kpi) -> KpiRead:
    return KpiRead(
        id=entity.id,
        entity_type=entity.entity_type,
        name=entity.name,
        description=entity.description,
        goal_id=kpi.goal_id,
        target=kpi.target,
        unit=kpi.unit,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_kpi(
    session: AsyncSession, goal_id: str, name: str, target: float | None, unit: str
) -> tuple[Entity, Kpi]:
    """Flushes but does not commit — caller (goal_service) owns the transaction boundary."""
    entity = Entity(
        entity_type="kpi",
        name=name,
        owner="",
        status="active",
        lifecycle_stage="active",
    )
    session.add(entity)
    await session.flush()  # populate entity.id

    kpi = Kpi(entity_id=entity.id, goal_id=goal_id, target=target, unit=unit)
    session.add(kpi)
    await session.flush()
    return entity, kpi


async def get_kpi(session: AsyncSession, kpi_entity_id: str) -> tuple[Entity, Kpi] | None:
    result = await session.execute(
        select(Entity, Kpi).join(Kpi, Kpi.entity_id == Entity.id).where(Kpi.entity_id == kpi_entity_id)
    )
    return result.tuples().one_or_none()


async def list_kpis_for_goal(session: AsyncSession, goal_id: str) -> list[tuple[Entity, Kpi]]:
    result = await session.execute(
        select(Entity, Kpi).join(Kpi, Kpi.entity_id == Entity.id).where(Kpi.goal_id == goal_id)
    )
    return list(result.tuples().all())


async def update_kpi(
    session: AsyncSession, kpi_entity_id: str, name: str, target: float | None, unit: str
) -> tuple[Entity, Kpi]:
    """In-place update — id (entity_id) is preserved. Caller must have already validated the id exists."""
    row = await get_kpi(session, kpi_entity_id)
    if row is None:
        raise ValueError(f"KPI {kpi_entity_id} does not exist")
    entity, kpi = row
    entity.name = name
    kpi.target = target
    kpi.unit = unit
    await session.flush()
    return entity, kpi


async def delete_kpi(session: AsyncSession, kpi_entity_id: str) -> None:
    """Point delete of a single KPI (entity + kpi rows), leaving the goal's other KPIs untouched.

    Cleans up the KPI's alignment links and factor relations first (ADR-0004 R2: a link or
    factor dies with either of its ends).
    """
    row = await get_kpi(session, kpi_entity_id)
    if row is None:
        return
    entity, kpi = row
    await kpi_link_service.delete_links_for_kpi(session, kpi_entity_id)
    await kpi_factor_service.delete_factors_for_kpi(session, kpi_entity_id)
    await session.delete(kpi)
    await session.delete(entity)
    await session.flush()


async def delete_kpis_for_goal(session: AsyncSession, goal_id: str) -> None:
    """Bulk delete — used for whole-goal cascade delete, not for patch-time sync (see delete_kpi).

    Also cleans up each KPI's alignment links and factor relations (ADR-0004 R2).
    """
    rows = await list_kpis_for_goal(session, goal_id)
    for kpi_entity, kpi in rows:
        await kpi_link_service.delete_links_for_kpi(session, kpi_entity.id)
        await kpi_factor_service.delete_factors_for_kpi(session, kpi_entity.id)
        await session.delete(kpi)
        await session.delete(kpi_entity)
    await session.flush()
