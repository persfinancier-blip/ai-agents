from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import board_opinion, decision, entity, goal, scenario, status_log  # noqa: F401
from app.schemas.goal import GoalCreate, GoalKpi, GoalPatch
from app.services import goal_service


def test_compute_definiteness_no_kpis_is_fog() -> None:
    assert goal_service.compute_definiteness("alice@example.com", []) == "fog"


def test_compute_definiteness_kpi_without_numeric_target_is_fog() -> None:
    kpis = [{"name": "Revenue", "target": "a lot", "unit": "USD"}]
    assert goal_service.compute_definiteness("alice@example.com", kpis) == "fog"


def test_compute_definiteness_no_owner_is_fog() -> None:
    kpis = [{"name": "Revenue", "target": 100, "unit": "USD"}]
    assert goal_service.compute_definiteness("", kpis) == "fog"
    assert goal_service.compute_definiteness("   ", kpis) == "fog"


def test_compute_definiteness_owner_and_numeric_kpi_is_defined() -> None:
    kpis = [{"name": "Revenue", "target": 100, "unit": "USD"}]
    assert goal_service.compute_definiteness("alice@example.com", kpis) == "defined"


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
        entity_row, goal_row = await goal_service.create_goal(
            session,
            GoalCreate(
                name="Test goal", owner="owner@example.com", kpis=[GoalKpi(name="Revenue", target=100, unit="USD")]
            ),
        )
        assert entity_row.entity_type == "goal"
        assert goal_row.is_backlog is False

        updated = await goal_service.patch_goal(session, entity_row.id, GoalPatch(is_backlog=True))
        assert updated is not None
        updated_entity, updated_goal = updated
        assert updated_goal.is_backlog is True
        assert updated_entity.version == 2

    await engine.dispose()
