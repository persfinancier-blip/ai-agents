from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_session
from app.llm.factory import get_llm_provider
from app.main import app
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
from tests.fakes import DEFAULT_CFO_RESPONSE, FakeLLMProvider


@pytest_asyncio.fixture
async def fake_llm() -> FakeLLMProvider:
    return FakeLLMProvider(dict(DEFAULT_CFO_RESPONSE))


@pytest_asyncio.fixture
async def client(fake_llm: FakeLLMProvider) -> AsyncGenerator[AsyncClient, None]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncGenerator:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_llm_provider] = lambda: fake_llm

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()
