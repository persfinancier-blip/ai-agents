from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.kpi import Kpi
from app.models.kpi_factor import KpiFactor
from app.schemas.kpi_factor import KpiFactorRead


class KpiNotFoundError(Exception):
    """Raised when a factor references a composite/factor id that isn't an existing KPI."""


class SelfFactorError(Exception):
    """Raised when composite_kpi_id == factor_kpi_id."""


class FactorNotMeasurableError(Exception):
    """Raised when the factor KPI has no numeric target of its own.

    A factor must be measurable on its own — this is also the acyclicity guard: a composite
    KPI (target usually None) can never pass this check, so it can never become someone
    else's factor, and recursive composites can't happen.
    """


class DuplicateFactorError(Exception):
    """Raised when a (composite_kpi_id, factor_kpi_id) pair already exists."""


def to_kpi_factor_read(factor: KpiFactor) -> KpiFactorRead:
    return KpiFactorRead(
        id=factor.id,
        composite_kpi_id=factor.composite_kpi_id,
        factor_kpi_id=factor.factor_kpi_id,
        weight=factor.weight,
    )


async def _kpi_exists(session: AsyncSession, kpi_id: str) -> bool:
    result = await session.execute(select(Entity.id).where(Entity.id == kpi_id, Entity.entity_type == "kpi"))
    return result.scalar_one_or_none() is not None


async def _get_kpi_target(session: AsyncSession, kpi_id: str) -> float | None:
    result = await session.execute(select(Kpi.target).where(Kpi.entity_id == kpi_id))
    return result.scalar_one_or_none()


async def create_factor(session: AsyncSession, composite_kpi_id: str, factor_kpi_id: str, weight: float) -> KpiFactor:
    if composite_kpi_id == factor_kpi_id:
        raise SelfFactorError("A KPI cannot be a factor of itself")
    if not await _kpi_exists(session, composite_kpi_id):
        raise KpiNotFoundError(f"KPI {composite_kpi_id} does not exist")
    if not await _kpi_exists(session, factor_kpi_id):
        raise KpiNotFoundError(f"KPI {factor_kpi_id} does not exist")

    factor_target = await _get_kpi_target(session, factor_kpi_id)
    if factor_target is None:
        raise FactorNotMeasurableError(f"KPI {factor_kpi_id} has no target and cannot be used as a factor")

    existing = await session.execute(
        select(KpiFactor).where(
            KpiFactor.composite_kpi_id == composite_kpi_id,
            KpiFactor.factor_kpi_id == factor_kpi_id,
        )
    )
    if existing.scalars().first() is not None:
        raise DuplicateFactorError(f"Factor {factor_kpi_id} -> {composite_kpi_id} already exists")

    factor = KpiFactor(composite_kpi_id=composite_kpi_id, factor_kpi_id=factor_kpi_id, weight=weight)
    session.add(factor)
    await session.commit()
    await session.refresh(factor)
    return factor


async def get_factor(session: AsyncSession, factor_id: str) -> KpiFactor | None:
    result = await session.execute(select(KpiFactor).where(KpiFactor.id == factor_id))
    return result.scalar_one_or_none()


async def list_factors_for_composite(session: AsyncSession, composite_kpi_id: str) -> list[KpiFactor]:
    result = await session.execute(select(KpiFactor).where(KpiFactor.composite_kpi_id == composite_kpi_id))
    return list(result.scalars().all())


async def delete_factor(session: AsyncSession, factor_id: str) -> bool:
    factor = await get_factor(session, factor_id)
    if factor is None:
        return False
    await session.delete(factor)
    await session.commit()
    return True


async def delete_factors_for_kpi(session: AsyncSession, kpi_id: str) -> None:
    """ADR-0004 R2 applied to factors: a factor row dies if either its composite or its
    factor KPI is deleted. Flushes but does not commit — called from kpi_service.delete_kpi,
    which owns the transaction boundary.
    """
    result = await session.execute(
        select(KpiFactor).where(or_(KpiFactor.composite_kpi_id == kpi_id, KpiFactor.factor_kpi_id == kpi_id))
    )
    for factor in result.scalars().all():
        await session.delete(factor)
    await session.flush()


async def composite_kpi_ids(session: AsyncSession, kpi_ids: list[str]) -> set[str]:
    """Which of kpi_ids have at least one factor (i.e. are composite). Bulk, to avoid N+1."""
    if not kpi_ids:
        return set()
    result = await session.execute(select(KpiFactor.composite_kpi_id).where(KpiFactor.composite_kpi_id.in_(kpi_ids)))
    return set(result.scalars().all())


async def compute_value(session: AsyncSession, composite_kpi_id: str) -> float | None:
    """Raw Σ weight * factor.target — no normalization, no unit reconciliation (ADR-0004
    leaves this an open question). None if there are no factors (i.e. not composite).
    """
    factors = await list_factors_for_composite(session, composite_kpi_id)
    if not factors:
        return None
    total = 0.0
    for factor in factors:
        target = await _get_kpi_target(session, factor.factor_kpi_id)
        if target is not None:
            total += factor.weight * target
    return total
