from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.kpi import Kpi
from app.schemas.kpi import KpiRead


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


async def list_kpis_for_goal(session: AsyncSession, goal_id: str) -> list[tuple[Entity, Kpi]]:
    result = await session.execute(
        select(Entity, Kpi).join(Kpi, Kpi.entity_id == Entity.id).where(Kpi.goal_id == goal_id)
    )
    return list(result.tuples().all())


async def delete_kpis_for_goal(session: AsyncSession, goal_id: str) -> None:
    """Replace-all strategy for Step 2a; diff-based sync deferred to a later step."""
    rows = await list_kpis_for_goal(session, goal_id)
    for kpi_entity, kpi in rows:
        await session.delete(kpi)
        await session.delete(kpi_entity)
    await session.flush()
