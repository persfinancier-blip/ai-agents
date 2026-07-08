from httpx import AsyncClient


def _payload(**overrides: object) -> dict:
    base: dict = {
        "name": "Enter new market",
        "owner": "alice@example.com",
        "kpis": [{"name": "Revenue", "target": 1_000_000, "unit": "USD"}],
    }
    base.update(overrides)
    return base


async def test_create_and_get_goal(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["entity_type"] == "goal"
    assert body["status"] == "draft"
    assert body["lifecycle_stage"] == "draft"

    goal_id = body["id"]
    resp = await client.get(f"/api/v1/goals/{goal_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == _payload()["name"]


async def test_definiteness_fog_without_kpis(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload(kpis=[]))
    assert resp.status_code == 201
    assert resp.json()["definiteness"] == "fog"


async def test_definiteness_defined_with_kpi_and_owner(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload())
    assert resp.status_code == 201
    assert resp.json()["definiteness"] == "defined"


async def test_definiteness_fog_with_kpi_but_no_owner(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload(owner=""))
    assert resp.status_code == 201
    assert resp.json()["definiteness"] == "fog"


async def test_list_goals(client: AsyncClient) -> None:
    await client.post("/api/v1/goals", json=_payload(name="Goal A"))
    await client.post("/api/v1/goals", json=_payload(name="Goal B"))

    resp = await client.get("/api/v1/goals")
    assert resp.status_code == 200
    names = {row["name"] for row in resp.json()}
    assert names == {"Goal A", "Goal B"}


async def test_get_missing_goal_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/goals/does-not-exist")
    assert resp.status_code == 404


async def test_patch_goal_updates_fields(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"name": "Updated name"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Updated name"
    assert body["owner"] == _payload()["owner"]  # untouched fields survive


async def test_patch_missing_goal_returns_404(client: AsyncClient) -> None:
    resp = await client.patch("/api/v1/goals/does-not-exist", json={"name": "x"})
    assert resp.status_code == 404


async def test_is_backlog_defaults_false_and_patchable(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    body = create.json()
    assert body["is_backlog"] is False
    goal_id = body["id"]

    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"is_backlog": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_backlog"] is True
    assert body["definiteness"] == "defined"  # is_backlog doesn't affect definiteness
