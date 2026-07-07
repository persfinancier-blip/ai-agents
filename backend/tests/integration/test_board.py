from httpx import AsyncClient

from tests.fakes import FakeLLMProvider


async def _create_decision(client: AsyncClient) -> str:
    resp = await client.post(
        "/api/v1/decisions",
        json={
            "name": "Expand to new market",
            "owner": "alice@example.com",
            "problem": "Revenue growth has stalled in the core market.",
            "goal": "Identify a viable new market to enter within 2 quarters.",
            "initiator": "alice@example.com",
            "estimated_cost": 250000,
            "estimated_timeline_days": 120,
        },
    )
    assert resp.status_code == 201
    return str(resp.json()["id"])


async def test_analyze_persists_cfo_opinion(client: AsyncClient, fake_llm: FakeLLMProvider) -> None:
    decision_id = await _create_decision(client)

    resp = await client.post(f"/api/v1/decisions/{decision_id}/analyze")
    assert resp.status_code == 201
    body = resp.json()
    assert body["persona"] == "cfo"
    assert body["decision_id"] == decision_id
    assert body["confidence"] == 0.7
    assert body["key_risks"] == ["Currency exposure", "Regulatory delays"]

    assert len(fake_llm.calls) == 1
    assert "CFO" in fake_llm.calls[0]["system"]
    assert "Revenue growth has stalled" in fake_llm.calls[0]["user"]


async def test_get_board_lists_opinions(client: AsyncClient) -> None:
    decision_id = await _create_decision(client)
    await client.post(f"/api/v1/decisions/{decision_id}/analyze")

    resp = await client.get(f"/api/v1/decisions/{decision_id}/board")
    assert resp.status_code == 200
    opinions = resp.json()
    assert len(opinions) == 1
    assert opinions[0]["persona"] == "cfo"


async def test_analyze_missing_decision_returns_404(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/decisions/does-not-exist/analyze")
    assert resp.status_code == 404


async def test_get_board_missing_decision_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/decisions/does-not-exist/board")
    assert resp.status_code == 404
