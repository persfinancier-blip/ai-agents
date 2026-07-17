import pytest
from sqlalchemy import select
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
    unit,
    unit_group,
)
from app.models.entity import Entity
from app.models.goal import Goal
from app.models.kpi import Kpi
from app.models.unit import UnitKind
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch
from app.schemas.unit import UnitCreate
from app.services import goal_service, unit_service
from app.services.goal_service import GoalKpiNotFoundError, GoalUnitNotFoundError


def _make_engine():
    return create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def test_compute_definiteness_no_kpis_is_fog() -> None:
    assert goal_service.compute_definiteness("unit-1", []) == "fog"


def test_compute_definiteness_kpi_not_measurable_is_fog() -> None:
    assert goal_service.compute_definiteness("unit-1", [False]) == "fog"


def test_compute_definiteness_no_unit_is_fog() -> None:
    assert goal_service.compute_definiteness(None, [True]) == "fog"


def test_compute_definiteness_unit_and_measurable_kpi_is_defined() -> None:
    assert goal_service.compute_definiteness("unit-1", [True]) == "defined"


def test_compute_definiteness_group_owner_is_defined() -> None:
    """ADR-0007: a group id is just another entity id to this check — same as a unit id."""
    assert goal_service.compute_definiteness("group-1", [True]) == "defined"


async def test_create_and_patch_goal() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        unit_entity, _unit = await unit_service.create_unit(session, UnitCreate(name="Alice", kind=UnitKind.EMPLOYEE))
        entity_row, goal_row, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal", unit_id=unit_entity.id, kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]
            ),
        )
        assert entity_row.entity_type == "goal"
        assert goal_row.is_backlog is False
        assert goal_row.unit_id == unit_entity.id
        assert len(kpi_rows) == 1
        kpi_entity, kpi_row = kpi_rows[0]
        assert kpi_entity.entity_type == "kpi"
        assert kpi_entity.id != entity_row.id  # KPI has its own stable id
        assert kpi_row.target == 100

        updated = await goal_service.patch_goal(session, entity_row.id, GoalPatch(is_backlog=True))
        assert updated is not None
        updated_entity, updated_goal, updated_kpi_rows = updated
        assert updated_goal.is_backlog is True
        assert updated_entity.version == 2
        assert len(updated_kpi_rows) == 1  # untouched by a patch that doesn't mention kpis

    await engine.dispose()


async def test_create_goal_with_unknown_unit_id_raises() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        with pytest.raises(GoalUnitNotFoundError):
            await goal_service.create_goal(session, GoalCreate(name="Test goal", unit_id="does-not-exist"))

    await engine.dispose()


async def test_patch_goal_with_unknown_unit_id_raises() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, _, _ = await goal_service.create_goal(session, GoalCreate(name="Test goal"))

        with pytest.raises(GoalUnitNotFoundError):
            await goal_service.patch_goal(session, entity_row.id, GoalPatch(unit_id="does-not-exist"))

    await engine.dispose()


async def test_patch_goal_kpis_replaces_the_set() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, _goal_row, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(name="Test goal", kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]),
        )
        assert len(kpi_rows) == 1

        updated = await goal_service.patch_goal(
            session,
            entity_row.id,
            GoalPatch(
                kpis=[
                    GoalKpi(name="Revenue", target=200, unit="USD"),
                    GoalKpi(name="NPS", target=None, unit="score"),
                ]
            ),
        )
        assert updated is not None
        _updated_entity, _updated_goal, updated_kpi_rows = updated
        assert len(updated_kpi_rows) == 2

    await engine.dispose()


async def test_would_create_cycle_direct_transitive_and_valid_move() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        root, _, _ = await goal_service.create_goal(session, GoalCreate(name="Root"))
        child, _, _ = await goal_service.create_goal(session, GoalCreate(name="Child", parent_id=root.id))
        grandchild, _, _ = await goal_service.create_goal(session, GoalCreate(name="Grandchild", parent_id=child.id))

        assert await goal_service.would_create_cycle(session, root.id, root.id) is True  # self-parent
        assert await goal_service.would_create_cycle(session, root.id, grandchild.id) is True  # transitive
        assert await goal_service.would_create_cycle(session, grandchild.id, root.id) is False  # valid move

    await engine.dispose()


async def test_cascade_delete_removes_subtree_and_kpi_entities() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        parent_entity, _, _ = await goal_service.create_goal(
            session,
            GoalCreate(name="Parent", kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]),
        )
        await goal_service.create_goal(
            session,
            GoalCreate(
                name="Child",
                parent_id=parent_entity.id,
                kpis=[GoalKpi(name="NPS", target=50, unit="score")],
            ),
        )

        outcome = await goal_service.delete_goal(session, parent_entity.id, cascade=True)
        assert outcome == "ok"

        assert (await session.execute(select(Goal))).scalars().all() == []
        assert (await session.execute(select(Kpi))).scalars().all() == []
        remaining_kpi_entities = (
            (await session.execute(select(Entity).where(Entity.entity_type == "kpi"))).scalars().all()
        )
        assert remaining_kpi_entities == []  # no orphan entity rows left behind by the cascade

    await engine.dispose()


async def test_delete_with_children_blocked_without_cascade() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        parent_entity, _, _ = await goal_service.create_goal(session, GoalCreate(name="Parent"))
        await goal_service.create_goal(session, GoalCreate(name="Child", parent_id=parent_entity.id))

        assert await goal_service.delete_goal(session, parent_entity.id, cascade=False) == "has_children"
        assert await goal_service.delete_goal(session, "does-not-exist", cascade=False) == "not_found"

    await engine.dispose()


async def test_sync_kpis_preserves_id_of_unchanged_kpi() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        goal_entity, _, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal",
                kpis=[
                    GoalKpi(name="Revenue", target=100, unit="USD"),
                    GoalKpi(name="NPS", target=40, unit="score"),
                ],
            ),
        )
        revenue_id = next(e.id for e, k in kpi_rows if e.name == "Revenue")
        nps_id = next(e.id for e, k in kpi_rows if e.name == "NPS")

        updated = await goal_service.patch_goal(
            session,
            goal_entity.id,
            GoalPatch(
                kpis=[
                    GoalKpi(id=revenue_id, name="Revenue", target=200, unit="USD"),
                    GoalKpi(id=nps_id, name="NPS", target=40, unit="score"),
                ]
            ),
        )
        assert updated is not None
        _updated_entity, _updated_goal, updated_kpi_rows = updated
        updated_by_id = {e.id: k for e, k in updated_kpi_rows}
        assert set(updated_by_id) == {revenue_id, nps_id}  # ids unchanged
        assert updated_by_id[revenue_id].target == 200  # value updated in place

    await engine.dispose()


async def test_sync_kpis_add_new_and_delete_omitted_without_orphan_entity() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        goal_entity, _, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal",
                kpis=[
                    GoalKpi(name="Revenue", target=100, unit="USD"),
                    GoalKpi(name="NPS", target=40, unit="score"),
                ],
            ),
        )
        revenue_id = next(e.id for e, k in kpi_rows if e.name == "Revenue")
        nps_id = next(e.id for e, k in kpi_rows if e.name == "NPS")

        # Keep Revenue (by id), drop NPS (omitted), add a brand-new KPI (no id).
        updated = await goal_service.patch_goal(
            session,
            goal_entity.id,
            GoalPatch(
                kpis=[
                    GoalKpi(id=revenue_id, name="Revenue", target=100, unit="USD"),
                    GoalKpi(name="CSAT", target=90, unit="score"),
                ]
            ),
        )
        assert updated is not None
        _updated_entity, _updated_goal, updated_kpi_rows = updated
        updated_ids = {e.id for e, _k in updated_kpi_rows}
        assert revenue_id in updated_ids
        assert nps_id not in updated_ids
        assert len(updated_ids) == 2  # Revenue (kept) + CSAT (new)

        orphan_kpi_entity = (await session.execute(select(Entity).where(Entity.id == nps_id))).scalars().one_or_none()
        assert orphan_kpi_entity is None  # deleted KPI leaves no orphan entity row
        orphan_kpi_row = (await session.execute(select(Kpi).where(Kpi.entity_id == nps_id))).scalars().one_or_none()
        assert orphan_kpi_row is None

    await engine.dispose()


async def test_sync_kpis_unknown_id_raises() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        goal_entity, _, _ = await goal_service.create_goal(session, GoalCreate(name="Test goal"))

        with pytest.raises(GoalKpiNotFoundError):
            await goal_service.patch_goal(
                session,
                goal_entity.id,
                GoalPatch(kpis=[GoalKpi(id="does-not-belong-here", name="X", target=1, unit="")]),
            )

    await engine.dispose()
