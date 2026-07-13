from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.kpi_link import KpiLink, KpiLinkType
from app.schemas.kpi_link import KpiLinkRead


class KpiNotFoundError(Exception):
    """Raised when a link references a source/target id that isn't an existing KPI."""


class SelfLinkError(Exception):
    """Raised when source_kpi_id == target_kpi_id."""


class DuplicateLinkError(Exception):
    """Raised when a (source, target, link_type) triple already exists."""


def to_kpi_link_read(link: KpiLink) -> KpiLinkRead:
    return KpiLinkRead(
        id=link.id,
        source_kpi_id=link.source_kpi_id,
        target_kpi_id=link.target_kpi_id,
        link_type=link.link_type,
    )


async def _kpi_exists(session: AsyncSession, kpi_id: str) -> bool:
    result = await session.execute(select(Entity.id).where(Entity.id == kpi_id, Entity.entity_type == "kpi"))
    return result.scalar_one_or_none() is not None


async def create_link(session: AsyncSession, source_kpi_id: str, target_kpi_id: str, link_type: KpiLinkType) -> KpiLink:
    """Cycles are not checked here — a link that closes a loop is created as usual (Step 3c adds detection)."""
    if source_kpi_id == target_kpi_id:
        raise SelfLinkError("A KPI cannot link to itself")
    if not await _kpi_exists(session, source_kpi_id):
        raise KpiNotFoundError(f"KPI {source_kpi_id} does not exist")
    if not await _kpi_exists(session, target_kpi_id):
        raise KpiNotFoundError(f"KPI {target_kpi_id} does not exist")

    existing = await session.execute(
        select(KpiLink).where(
            KpiLink.source_kpi_id == source_kpi_id,
            KpiLink.target_kpi_id == target_kpi_id,
            KpiLink.link_type == link_type.value,
        )
    )
    if existing.scalars().first() is not None:
        raise DuplicateLinkError(f"Link {source_kpi_id} -> {target_kpi_id} ({link_type.value}) already exists")

    link = KpiLink(source_kpi_id=source_kpi_id, target_kpi_id=target_kpi_id, link_type=link_type.value)
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return link


async def get_link(session: AsyncSession, link_id: str) -> KpiLink | None:
    result = await session.execute(select(KpiLink).where(KpiLink.id == link_id))
    return result.scalar_one_or_none()


async def list_links(session: AsyncSession) -> list[KpiLink]:
    result = await session.execute(select(KpiLink))
    return list(result.scalars().all())


async def list_links_for_kpi(session: AsyncSession, kpi_id: str) -> list[KpiLink]:
    """Links where kpi_id is either endpoint (source or target)."""
    result = await session.execute(
        select(KpiLink).where(or_(KpiLink.source_kpi_id == kpi_id, KpiLink.target_kpi_id == kpi_id))
    )
    return list(result.scalars().all())


async def delete_link(session: AsyncSession, link_id: str) -> bool:
    link = await get_link(session, link_id)
    if link is None:
        return False
    await session.delete(link)
    await session.commit()
    return True


async def delete_links_for_kpi(session: AsyncSession, kpi_id: str) -> None:
    """ADR-0004 R2: a link dies with either of its ends. Flushes but does not commit —
    called from kpi_service.delete_kpi, which owns the transaction boundary.
    """
    links = await list_links_for_kpi(session, kpi_id)
    for link in links:
        await session.delete(link)
    await session.flush()
