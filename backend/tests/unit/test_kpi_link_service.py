import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import board_opinion, decision, entity, goal, kpi, kpi_link, scenario, status_log  # noqa: F401
from app.models.kpi_link import KpiLinkType
from app.schemas.goal import GoalCreate, GoalKpi
from app.services import goal_service, kpi_link_service
from app.services.kpi_link_service import DuplicateLinkError, KpiNotFoundError, SelfLinkError


async def _create_kpi(session, name: str) -> str:
    _entity, _goal, kpi_rows = await goal_service.create_goal(
        session,
        GoalCreate(name=f"Goal {name}", owner="owner@example.com", kpis=[GoalKpi(name=name, target=100, unit="USD")]),
    )
    kpi_entity, _kpi = kpi_rows[0]
    return kpi_entity.id


async def test_create_link_self_link_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        kpi_id = await _create_kpi(session, "Solo")

        with pytest.raises(SelfLinkError):
            await kpi_link_service.create_link(session, kpi_id, kpi_id, KpiLinkType.CONTRIBUTES)

    await engine.dispose()


async def test_create_link_nonexistent_kpi_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        kpi_id = await _create_kpi(session, "Real")

        with pytest.raises(KpiNotFoundError):
            await kpi_link_service.create_link(session, "does-not-exist", kpi_id, KpiLinkType.CONTRIBUTES)

        with pytest.raises(KpiNotFoundError):
            await kpi_link_service.create_link(session, kpi_id, "does-not-exist", KpiLinkType.CONTRIBUTES)

    await engine.dispose()


async def test_create_link_duplicate_raises() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        source_id = await _create_kpi(session, "Source")
        target_id = await _create_kpi(session, "Target")

        await kpi_link_service.create_link(session, source_id, target_id, KpiLinkType.CONTRIBUTES)

        with pytest.raises(DuplicateLinkError):
            await kpi_link_service.create_link(session, source_id, target_id, KpiLinkType.CONTRIBUTES)

        # Same pair, different type is not a duplicate.
        other_type = await kpi_link_service.create_link(session, source_id, target_id, KpiLinkType.CONSTRAINS)
        assert other_type.link_type == KpiLinkType.CONSTRAINS.value

    await engine.dispose()


async def test_delete_links_for_kpi_cleans_both_sides() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        a = await _create_kpi(session, "A")
        b = await _create_kpi(session, "B")
        c = await _create_kpi(session, "C")

        # b is the source of one link and the target of another.
        await kpi_link_service.create_link(session, b, a, KpiLinkType.CONTRIBUTES)
        await kpi_link_service.create_link(session, c, b, KpiLinkType.DEPENDS_ON)
        # Unrelated link that must survive.
        await kpi_link_service.create_link(session, a, c, KpiLinkType.CONSTRAINS)

        assert len(await kpi_link_service.list_links_for_kpi(session, b)) == 2

        await kpi_link_service.delete_links_for_kpi(session, b)
        await session.commit()

        assert await kpi_link_service.list_links_for_kpi(session, b) == []
        remaining = await kpi_link_service.list_links(session)
        assert len(remaining) == 1
        assert remaining[0].source_kpi_id == a
        assert remaining[0].target_kpi_id == c

    await engine.dispose()
