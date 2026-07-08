from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import board_opinion, decision, entity, goal, kpi, scenario, status_log  # noqa: F401
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch
from app.services import goal_service


def test_compute_definiteness_no_kpis_is_fog() -> None:
    assert goal_service.compute_definiteness("alice@example.com", []) == "fog"


def test_compute_definiteness_kpi_without_target_is_fog() -> None:
    assert goal_service.compute_definiteness("alice@example.com", [None]) == "fog"


def test_compute_definiteness_no_owner_is_fog() -> None:
    assert goal_service.compute_definiteness("", [100.0]) == "fog"
    assert goal_service.compute_definiteness("   ", [100.0]) == "fog"


def test_compute_definiteness_owner_and_numeric_target_is_defined() -> None:
    assert goal_service.compute_definiteness("alice@example.com", [100.0]) == "defined"


async def test_create_and_patch_goal() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, goal_row, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal", owner="owner@example.com", kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]
            ),
        )
        assert entity_row.entity_type == "goal"
        assert goal_row.is_backlog is False
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


async def test_patch_goal_kpis_replaces_the_set() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, _goal_row, kpi_rows = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal", owner="owner@example.com", kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]
            ),
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
