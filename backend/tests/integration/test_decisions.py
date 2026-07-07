from httpx import AsyncClient


def _payload(**overrides: object) -> dict:
    base = {
        "name": "Expand to new market",
        "owner": "alice@example.com",
        "problem": "Revenue growth has stalled in the core market.",
        "goal": "Identify a viable new market to enter within 2 quarters.",
        "initiator": "alice@example.com",
    }
    base.update(overrides)
    return base


async def test_create_and_get_decision(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/decisions", json=_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Expand to new market"
    assert body["status"] == "draft"
    assert body["lifecycle_stage"] == "discovered"
    assert body["final_decision"] is None

    decision_id = body["id"]
    resp = await client.get(f"/api/v1/decisions/{decision_id}")
    assert resp.status_code == 200
    assert resp.json()["problem"] == _payload()["problem"]


async def test_list_decisions(client: AsyncClient) -> None:
    await client.post("/api/v1/decisions", json=_payload(name="Decision A"))
    await client.post("/api/v1/decisions", json=_payload(name="Decision B"))

    resp = await client.get("/api/v1/decisions")
    assert resp.status_code == 200
    names = {row["name"] for row in resp.json()}
    assert names == {"Decision A", "Decision B"}


async def test_get_missing_decision_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/decisions/does-not-exist")
    assert resp.status_code == 404


async def test_patch_decision_updates_fields(client: AsyncClient) -> None:
    create = await client.post("/api/v1/decisions", json=_payload())
    decision_id = create.json()["id"]

    resp = await client.patch(f"/api/v1/decisions/{decision_id}", json={"name": "Updated name"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Updated name"
    assert body["problem"] == _payload()["problem"]  # untouched fields survive


async def test_patch_missing_decision_returns_404(client: AsyncClient) -> None:
    resp = await client.patch("/api/v1/decisions/does-not-exist", json={"name": "x"})
    assert resp.status_code == 404


async def test_healthz(client: AsyncClient) -> None:
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
