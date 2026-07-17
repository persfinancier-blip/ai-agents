import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (  # noqa: F401
    board_opinion,
    decision,
    entity,
    goal,
    kpi,
    kpi_factor,
    kpi_link,
    kpi_link_cycle,
    scenario,
    status_log,
)
from app.schemas.goal import GoalCreate, GoalKpi
from app.services import goal_service, kpi_factor_service
from app.services.kpi_factor_service import (
    DuplicateFactorError,
    FactorNotMeasurableError,
    KpiNotFoundError,
    SelfFactorError,
)


async def _create_kpi(session, name: str, target: float | None) -> str:
    _entity, _goal, kpi_rows = await goal_service.create_goal(
        session,
        GoalCreate(name=f"Goal {name}", kpis=[GoalKpi(name=name, target=target, unit="pt")]),
    )
    kpi_entity, _kpi = kpi_rows[0]
    return kpi_entity.id


async def test_create_factor_self_factor_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        kpi_id = await _create_kpi(session, "Solo", 10)

        with pytest.raises(SelfFactorError):
            await kpi_factor_service.create_factor(session, kpi_id, kpi_id, 1.0)

    await engine.dispose()


async def test_create_factor_nonexistent_kpi_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        kpi_id = await _create_kpi(session, "Real", 10)

        with pytest.raises(KpiNotFoundError):
            await kpi_factor_service.create_factor(session, "does-not-exist", kpi_id, 1.0)

        with pytest.raises(KpiNotFoundError):
            await kpi_factor_service.create_factor(session, kpi_id, "does-not-exist", 1.0)

    await engine.dispose()


async def test_create_factor_without_target_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        composite_id = await _create_kpi(session, "Composite", None)
        unmeasurable_factor_id = await _create_kpi(session, "Unmeasurable", None)

        with pytest.raises(FactorNotMeasurableError):
            await kpi_factor_service.create_factor(session, composite_id, unmeasurable_factor_id, 1.0)

    await engine.dispose()


async def test_create_factor_duplicate_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        composite_id = await _create_kpi(session, "Composite", None)
        factor_id = await _create_kpi(session, "Factor", 10)

        await kpi_factor_service.create_factor(session, composite_id, factor_id, 1.0)

        with pytest.raises(DuplicateFactorError):
            await kpi_factor_service.create_factor(session, composite_id, factor_id, 2.0)

    await engine.dispose()


async def test_compute_value_sums_weighted_targets() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        composite_id = await _create_kpi(session, "Composite", None)
        reviews_id = await _create_kpi(session, "Reviews", 4.0)
        ltv_id = await _create_kpi(session, "LTV", 100.0)
        defects_id = await _create_kpi(session, "Defects", 2.0)

        await kpi_factor_service.create_factor(session, composite_id, reviews_id, 0.3)
        await kpi_factor_service.create_factor(session, composite_id, ltv_id, 0.3)
        await kpi_factor_service.create_factor(session, composite_id, defects_id, 0.4)

        value = await kpi_factor_service.compute_value(session, composite_id)
        assert value == pytest.approx(0.3 * 4.0 + 0.3 * 100.0 + 0.4 * 2.0)

    await engine.dispose()


async def test_compute_value_no_factors_returns_none() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        kpi_id = await _create_kpi(session, "Lonely", None)
        assert await kpi_factor_service.compute_value(session, kpi_id) is None

    await engine.dispose()


async def test_composite_kpi_without_target_but_with_factor_is_measurable() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        composite_id = await _create_kpi(session, "Composite", None)
        factor_id = await _create_kpi(session, "Factor", 10)
        await kpi_factor_service.create_factor(session, composite_id, factor_id, 1.0)

        composite_ids = await kpi_factor_service.composite_kpi_ids(session, [composite_id, factor_id])
        assert composite_ids == {composite_id}

        # target is None but the KPI is composite — same "measurable" flag to_goal_read would compute.
        is_measurable = composite_id in composite_ids
        assert goal_service.compute_definiteness("owner@example.com", [is_measurable]) == "defined"

    await engine.dispose()
