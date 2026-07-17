from httpx import AsyncClient


def _payload(**overrides: object) -> dict:
    base: dict = {"name": "Смирнова А.", "kind": "employee"}
    base.update(overrides)
    return base


async def test_create_and_get_unit(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/units", json=_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Смирнова А."
    assert body["kind"] == "employee"

    unit_id = body["entity_id"]
    resp = await client.get(f"/api/v1/units/{unit_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Смирнова А."


async def test_get_missing_unit_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/units/does-not-exist")
    assert resp.status_code == 404


async def test_list_units(client: AsyncClient) -> None:
    await client.post("/api/v1/units", json=_payload(name="A"))
    await client.post("/api/v1/units", json=_payload(name="B", kind="agent"))

    resp = await client.get("/api/v1/units")
    assert resp.status_code == 200
    names = {row["name"] for row in resp.json()}
    assert names == {"A", "B"}


async def test_patch_unit(client: AsyncClient) -> None:
    create = await client.post("/api/v1/units", json=_payload())
    unit_id = create.json()["entity_id"]

    resp = await client.patch(f"/api/v1/units/{unit_id}", json={"name": "Renamed", "kind": "device"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Renamed"
    assert body["kind"] == "device"


async def test_patch_missing_unit_returns_404(client: AsyncClient) -> None:
    resp = await client.patch("/api/v1/units/does-not-exist", json={"name": "x"})
    assert resp.status_code == 404


async def test_delete_unit_nulls_out_referencing_goals(client: AsyncClient) -> None:
    create = await client.post("/api/v1/units", json=_payload())
    unit_id = create.json()["entity_id"]

    goal = await client.post(
        "/api/v1/goals",
        json={"name": "Goal", "unit_id": unit_id, "kpis": [{"name": "Revenue", "target": 100, "unit": "USD"}]},
    )
    goal_id = goal.json()["id"]
    assert goal.json()["unit_id"] == unit_id

    resp = await client.delete(f"/api/v1/units/{unit_id}")
    assert resp.status_code == 204

    assert (await client.get(f"/api/v1/units/{unit_id}")).status_code == 404

    goal_resp = await client.get(f"/api/v1/goals/{goal_id}")
    assert goal_resp.status_code == 200
    assert goal_resp.json()["unit_id"] is None
    assert goal_resp.json()["definiteness"] == "fog"


async def test_delete_missing_unit_returns_404(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/units/does-not-exist")
    assert resp.status_code == 404
