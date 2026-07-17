from httpx import AsyncClient


def _dept(**overrides: object) -> dict:
    base: dict = {"name": "Отдел продаж", "kind": "department"}
    base.update(overrides)
    return base


def _team(**overrides: object) -> dict:
    base: dict = {"name": "Команда запуска", "kind": "team"}
    base.update(overrides)
    return base


async def test_create_and_get_department(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/unit-groups", json=_dept())
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Отдел продаж"
    assert body["kind"] == "department"
    assert body["parent_id"] is None

    resp = await client.get(f"/api/v1/unit-groups/{body['entity_id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Отдел продаж"


async def test_department_parent_must_be_department(client: AsyncClient) -> None:
    team = (await client.post("/api/v1/unit-groups", json=_team())).json()

    resp = await client.post("/api/v1/unit-groups", json=_dept(parent_id=team["entity_id"]))
    assert resp.status_code == 422


async def test_department_parent_chain(client: AsyncClient) -> None:
    root = (await client.post("/api/v1/unit-groups", json=_dept(name="Root"))).json()
    child = (await client.post("/api/v1/unit-groups", json=_dept(name="Child", parent_id=root["entity_id"]))).json()
    assert child["parent_id"] == root["entity_id"]


async def test_department_parent_not_found(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/unit-groups", json=_dept(parent_id="does-not-exist"))
    assert resp.status_code == 404


async def test_department_cycle_rejected(client: AsyncClient) -> None:
    root = (await client.post("/api/v1/unit-groups", json=_dept(name="Root"))).json()
    child = (await client.post("/api/v1/unit-groups", json=_dept(name="Child", parent_id=root["entity_id"]))).json()

    resp = await client.patch(f"/api/v1/unit-groups/{root['entity_id']}", json={"parent_id": child["entity_id"]})
    assert resp.status_code == 409


async def test_unit_home_department_set_and_validated(client: AsyncClient) -> None:
    dept = (await client.post("/api/v1/unit-groups", json=_dept())).json()

    resp = await client.post(
        "/api/v1/units", json={"name": "A", "kind": "employee", "department_id": dept["entity_id"]}
    )
    assert resp.status_code == 201
    assert resp.json()["department_id"] == dept["entity_id"]

    team = (await client.post("/api/v1/unit-groups", json=_team())).json()
    resp = await client.post(
        "/api/v1/units", json={"name": "B", "kind": "employee", "department_id": team["entity_id"]}
    )
    assert resp.status_code == 422

    resp = await client.post("/api/v1/units", json={"name": "C", "kind": "employee", "department_id": "nope"})
    assert resp.status_code == 404


async def test_team_add_and_remove_member(client: AsyncClient) -> None:
    team = (await client.post("/api/v1/unit-groups", json=_team())).json()
    unit = (await client.post("/api/v1/units", json={"name": "A", "kind": "employee"})).json()

    resp = await client.post(f"/api/v1/unit-groups/{team['entity_id']}/members/{unit['entity_id']}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/unit-groups/{team['entity_id']}/members")
    assert resp.status_code == 200
    assert resp.json() == [unit["entity_id"]]

    resp = await client.delete(f"/api/v1/unit-groups/{team['entity_id']}/members/{unit['entity_id']}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/unit-groups/{team['entity_id']}/members")
    assert resp.json() == []


async def test_team_membership_rejected_for_department(client: AsyncClient) -> None:
    dept = (await client.post("/api/v1/unit-groups", json=_dept())).json()
    unit = (await client.post("/api/v1/units", json={"name": "A", "kind": "employee"})).json()

    resp = await client.post(f"/api/v1/unit-groups/{dept['entity_id']}/members/{unit['entity_id']}")
    assert resp.status_code == 422


async def test_goal_owned_by_department_is_valid(client: AsyncClient) -> None:
    dept = (await client.post("/api/v1/unit-groups", json=_dept())).json()

    resp = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goal owned by dept",
            "unit_id": dept["entity_id"],
            "kpis": [{"name": "Revenue", "target": 100, "unit": "USD"}],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["unit_id"] == dept["entity_id"]
    assert body["definiteness"] == "defined"


async def test_goal_owned_by_arbitrary_entity_rejected(client: AsyncClient) -> None:
    goal = (
        await client.post(
            "/api/v1/goals",
            json={"name": "Some goal", "kpis": [{"name": "Revenue", "target": 100, "unit": "USD"}]},
        )
    ).json()

    resp = await client.post(
        "/api/v1/goals",
        json={
            "name": "Owner is a goal, not a unit/group",
            "unit_id": goal["id"],
            "kpis": [{"name": "Revenue", "target": 100, "unit": "USD"}],
        },
    )
    assert resp.status_code == 422


async def test_delete_group_nulls_inbound_refs(client: AsyncClient) -> None:
    root = (await client.post("/api/v1/unit-groups", json=_dept(name="Root"))).json()
    child_dept = (
        await client.post("/api/v1/unit-groups", json=_dept(name="Child", parent_id=root["entity_id"]))
    ).json()
    unit = (
        await client.post("/api/v1/units", json={"name": "A", "kind": "employee", "department_id": root["entity_id"]})
    ).json()
    goal = (
        await client.post(
            "/api/v1/goals",
            json={
                "name": "Goal owned by root dept",
                "unit_id": root["entity_id"],
                "kpis": [{"name": "Revenue", "target": 100, "unit": "USD"}],
            },
        )
    ).json()

    resp = await client.delete(f"/api/v1/unit-groups/{root['entity_id']}")
    assert resp.status_code == 204

    assert (await client.get(f"/api/v1/unit-groups/{root['entity_id']}")).status_code == 404

    refreshed_unit = (await client.get(f"/api/v1/units/{unit['entity_id']}")).json()
    assert refreshed_unit["department_id"] is None

    refreshed_child = (await client.get(f"/api/v1/unit-groups/{child_dept['entity_id']}")).json()
    assert refreshed_child["parent_id"] is None

    refreshed_goal = (await client.get(f"/api/v1/goals/{goal['id']}")).json()
    assert refreshed_goal["unit_id"] is None
    assert refreshed_goal["definiteness"] == "fog"


async def test_delete_missing_group_returns_404(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/unit-groups/does-not-exist")
    assert resp.status_code == 404
