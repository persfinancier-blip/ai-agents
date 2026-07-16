from httpx import AsyncClient


async def _create_kpi(client: AsyncClient, name: str, target: float | None) -> str:
    resp = await client.post(
        "/api/v1/goals",
        json={
            "name": f"Goal for {name}",
            "kpis": [{"name": name, "target": target, "unit": "pt"}],
        },
    )
    return resp.json()["kpis"][0]["id"]


async def _create_unit_id(client: AsyncClient) -> str:
    resp = await client.post("/api/v1/units", json={"name": "Alice", "kind": "employee"})
    return resp.json()["entity_id"]


async def test_composite_kpi_computed_value_and_definiteness(client: AsyncClient) -> None:
    unit_id = await _create_unit_id(client)
    goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goodwill goal",
            "unit_id": unit_id,
            "kpis": [
                {"name": "Reviews", "target": 4.0, "unit": "stars"},
                {"name": "LTV", "target": 100.0, "unit": "USD"},
                {"name": "Goodwill", "target": None, "unit": ""},
            ],
        },
    )
    goal_id = goal.json()["id"]
    kpis = goal.json()["kpis"]
    reviews_id = next(k["id"] for k in kpis if k["name"] == "Reviews")
    ltv_id = next(k["id"] for k in kpis if k["name"] == "LTV")
    goodwill_id = next(k["id"] for k in kpis if k["name"] == "Goodwill")

    # Composite alone (before factors), goal would be fog: two measurable KPIs exist already
    # (Reviews/LTV), so create a second goal to check the "composite is the only KPI" case.
    lonely_composite_goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Lonely composite",
            "unit_id": unit_id,
            "kpis": [{"name": "Solo", "target": None, "unit": ""}],
        },
    )
    assert lonely_composite_goal.json()["definiteness"] == "fog"
    lonely_goal_id = lonely_composite_goal.json()["id"]
    lonely_composite_id = lonely_composite_goal.json()["kpis"][0]["id"]

    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": goodwill_id, "factor_kpi_id": reviews_id, "weight": 0.3},
    )
    assert resp.status_code == 201
    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": goodwill_id, "factor_kpi_id": ltv_id, "weight": 0.7},
    )
    assert resp.status_code == 201

    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": lonely_composite_id, "factor_kpi_id": reviews_id, "weight": 1.0},
    )
    assert resp.status_code == 201

    resp = await client.get(f"/api/v1/goals/{goal_id}")
    body = resp.json()
    goodwill = next(k for k in body["kpis"] if k["id"] == goodwill_id)
    assert goodwill["computed_value"] == 0.3 * 4.0 + 0.7 * 100.0
    assert body["definiteness"] == "defined"

    resp = await client.get(f"/api/v1/goals/{lonely_goal_id}")
    body = resp.json()
    assert body["definiteness"] == "defined"  # composite via factor, no direct target
    solo = body["kpis"][0]
    assert solo["computed_value"] == 4.0


async def test_factor_with_unmeasurable_kpi_is_400(client: AsyncClient) -> None:
    composite_id = await _create_kpi(client, "Composite", None)
    unmeasurable_id = await _create_kpi(client, "Unmeasurable", None)

    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": composite_id, "factor_kpi_id": unmeasurable_id, "weight": 1.0},
    )
    assert resp.status_code == 400


async def test_self_factor_is_400(client: AsyncClient) -> None:
    kpi_id = await _create_kpi(client, "Solo", 10)
    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": kpi_id, "factor_kpi_id": kpi_id, "weight": 1.0},
    )
    assert resp.status_code == 400


async def test_nonexistent_kpi_in_factor_is_400(client: AsyncClient) -> None:
    composite_id = await _create_kpi(client, "Composite", None)
    resp = await client.post(
        "/api/v1/kpi-factors",
        json={"composite_kpi_id": composite_id, "factor_kpi_id": "does-not-exist", "weight": 1.0},
    )
    assert resp.status_code == 400


async def test_duplicate_factor_is_409(client: AsyncClient) -> None:
    composite_id = await _create_kpi(client, "Composite", None)
    factor_id = await _create_kpi(client, "Factor", 10)
    payload = {"composite_kpi_id": composite_id, "factor_kpi_id": factor_id, "weight": 1.0}

    first = await client.post("/api/v1/kpi-factors", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/v1/kpi-factors", json=payload)
    assert second.status_code == 409


async def test_list_factors_for_composite(client: AsyncClient) -> None:
    composite_id = await _create_kpi(client, "Composite", None)
    factor_a = await _create_kpi(client, "FactorA", 1)
    factor_b = await _create_kpi(client, "FactorB", 2)

    await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_a, "weight": 0.5}
    )
    await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_b, "weight": 0.5}
    )

    resp = await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_delete_factor(client: AsyncClient) -> None:
    composite_id = await _create_kpi(client, "Composite", None)
    factor_id = await _create_kpi(client, "Factor", 10)
    create = await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_id, "weight": 1.0}
    )
    factor_row_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/kpi-factors/{factor_row_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")
    assert resp.json() == []


async def test_delete_missing_factor_returns_404(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/kpi-factors/does-not-exist")
    assert resp.status_code == 404


async def test_deleting_factor_kpi_via_diff_sync_removes_factor_row(client: AsyncClient) -> None:
    goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goal",
            "kpis": [
                {"name": "FactorOne", "target": 10.0, "unit": "pt"},
                {"name": "FactorTwo", "target": 20.0, "unit": "pt"},
            ],
        },
    )
    goal_id = goal.json()["id"]
    kpis = goal.json()["kpis"]
    factor_one = next(k for k in kpis if k["name"] == "FactorOne")
    factor_two_id = next(k["id"] for k in kpis if k["name"] == "FactorTwo")

    composite_id = await _create_kpi(client, "Composite", None)
    await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_one["id"], "weight": 1.0}
    )
    await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_two_id, "weight": 1.0}
    )

    composite_before = (await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")).json()
    assert len(composite_before) == 2

    # Diff-sync patch omitting FactorOne deletes it (Step 3-0 behavior), which must cascade
    # through kpi_service.delete_kpi -> kpi_factor_service.delete_factors_for_kpi.
    resp = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"kpis": [{"id": factor_two_id, "name": "FactorTwo", "target": 20.0, "unit": "pt"}]},
    )
    assert resp.status_code == 200

    composite_after = (await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")).json()
    assert len(composite_after) == 1
    assert composite_after[0]["factor_kpi_id"] == factor_two_id


async def test_deleting_composite_kpi_removes_its_factor_rows(client: AsyncClient) -> None:
    goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goal",
            "kpis": [{"name": "Composite", "target": None, "unit": ""}],
        },
    )
    goal_id = goal.json()["id"]
    composite_id = goal.json()["kpis"][0]["id"]
    factor_id = await _create_kpi(client, "Factor", 10)

    await client.post(
        "/api/v1/kpi-factors", json={"composite_kpi_id": composite_id, "factor_kpi_id": factor_id, "weight": 1.0}
    )
    assert len((await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")).json()) == 1

    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"kpis": []})
    assert resp.status_code == 200

    assert (await client.get(f"/api/v1/kpi-factors?composite_kpi_id={composite_id}")).json() == []
