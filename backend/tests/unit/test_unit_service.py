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
)
from app.models.unit import UnitKind
from app.schemas.goal import GoalCreate
from app.schemas.unit import UnitCreate, UnitUpdate
from app.services import goal_service, unit_service


def _make_engine():
    return create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


async def test_create_and_get_unit() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, unit_row = await unit_service.create_unit(
            session, UnitCreate(name="Смирнова А.", kind=UnitKind.EMPLOYEE)
        )
        assert entity_row.entity_type == "unit"
        assert unit_row.kind == "employee"

        fetched = await unit_service.get_unit(session, entity_row.id)
        assert fetched is not None
        assert fetched[0].name == "Смирнова А."

    await engine.dispose()


async def test_list_units() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        await unit_service.create_unit(session, UnitCreate(name="A", kind=UnitKind.EMPLOYEE))
        await unit_service.create_unit(session, UnitCreate(name="B", kind=UnitKind.AGENT))

        rows = await unit_service.list_units(session)
        assert {e.name for e, _u in rows} == {"A", "B"}

    await engine.dispose()


async def test_patch_unit_updates_fields() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, _unit_row = await unit_service.create_unit(session, UnitCreate(name="A", kind=UnitKind.EMPLOYEE))

        updated = await unit_service.patch_unit(
            session, entity_row.id, UnitUpdate(name="A renamed", kind=UnitKind.AGENT)
        )
        assert updated is not None
        updated_entity, updated_unit = updated
        assert updated_entity.name == "A renamed"
        assert updated_unit.kind == "agent"

    await engine.dispose()


async def test_patch_missing_unit_returns_none() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        result = await unit_service.patch_unit(session, "does-not-exist", UnitUpdate(name="X"))
        assert result is None

    await engine.dispose()


async def test_delete_unit_nulls_out_unit_id_on_referencing_goals() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        unit_entity, _unit_row = await unit_service.create_unit(
            session, UnitCreate(name="Смирнова А.", kind=UnitKind.EMPLOYEE)
        )
        goal_entity, goal_row, _kpis = await goal_service.create_goal(
            session, GoalCreate(name="Goal owned by unit", unit_id=unit_entity.id)
        )
        assert goal_row.unit_id == unit_entity.id

        deleted = await unit_service.delete_unit(session, unit_entity.id)
        assert deleted is True

        assert await unit_service.get_unit(session, unit_entity.id) is None
        row = await goal_service.get_goal(session, goal_entity.id)
        assert row is not None
        _refreshed_entity, refreshed_goal = row
        assert refreshed_goal.unit_id is None  # falls back into fog, not deleted

    await engine.dispose()


async def test_delete_missing_unit_returns_false() -> None:
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        assert await unit_service.delete_unit(session, "does-not-exist") is False

    await engine.dispose()
