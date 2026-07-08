import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import board_opinion, decision, entity, goal, scenario, status_log  # noqa: F401
from app.schemas.decision import DecisionCreate, DecisionPatch
from app.services import decision_service
from app.services.decision_service import DecisionAlreadyDecidedError


async def test_patch_after_final_decision_is_rejected() -> None:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        entity_row, decision_row = await decision_service.create_decision(
            session,
            DecisionCreate(
                name="Test decision",
                owner="owner@example.com",
                problem="problem",
                goal="goal",
                initiator="owner@example.com",
            ),
        )
        decision_row.final_decision = "Go ahead"
        await session.commit()

        with pytest.raises(DecisionAlreadyDecidedError):
            await decision_service.patch_decision(session, entity_row.id, DecisionPatch(name="New name"))

    await engine.dispose()
