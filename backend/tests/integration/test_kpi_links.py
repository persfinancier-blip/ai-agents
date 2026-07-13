from httpx import AsyncClient


async def _create_kpi(client: AsyncClient, kpi_name: str = "Revenue", target: float | None = 100) -> str:
    resp = await client.post(
        "/api/v1/goals",
        json={
            "name": f"Goal for {kpi_name}",
            "owner": "alice@example.com",
            "kpis": [{"name": kpi_name, "target": target, "unit": "USD"}],
        },
    )
    return resp.json()["kpis"][0]["id"]


async def test_create_and_get_link(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")
    target_id = await _create_kpi(client, "Target")

    resp = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "contributes"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["source_kpi_id"] == source_id
    assert body["target_kpi_id"] == target_id
    assert body["link_type"] == "contributes"
    link_id = body["id"]

    resp = await client.get(f"/api/v1/kpi-links/{link_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == link_id


async def test_all_three_link_types_can_be_created(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")

    for link_type in ("contributes", "constrains", "depends_on"):
        target = await _create_kpi(client, f"Target-{link_type}")
        resp = await client.post(
            "/api/v1/kpi-links",
            json={"source_kpi_id": source_id, "target_kpi_id": target, "link_type": link_type},
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["link_type"] == link_type


async def test_invalid_link_type_is_422(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")
    target_id = await _create_kpi(client, "Target")

    resp = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "not-a-real-type"},
    )
    assert resp.status_code == 422


async def test_nonexistent_kpi_is_400(client: AsyncClient) -> None:
    target_id = await _create_kpi(client, "Target")

    resp = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": "does-not-exist", "target_kpi_id": target_id, "link_type": "contributes"},
    )
    assert resp.status_code == 400

    source_id = await _create_kpi(client, "Source")
    resp = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": "does-not-exist", "link_type": "contributes"},
    )
    assert resp.status_code == 400


async def test_self_link_is_400(client: AsyncClient) -> None:
    kpi_id = await _create_kpi(client, "Solo")

    resp = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": kpi_id, "target_kpi_id": kpi_id, "link_type": "contributes"},
    )
    assert resp.status_code == 400


async def test_duplicate_link_is_409(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")
    target_id = await _create_kpi(client, "Target")
    payload = {"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "contributes"}

    first = await client.post("/api/v1/kpi-links", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/kpi-links", json=payload)
    assert second.status_code == 409


async def test_one_kpi_as_source_of_multiple_links(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")
    target_a = await _create_kpi(client, "TargetA")
    target_b = await _create_kpi(client, "TargetB")

    resp_a = await client.post(
        "/api/v1/kpi-links", json={"source_kpi_id": source_id, "target_kpi_id": target_a, "link_type": "contributes"}
    )
    resp_b = await client.post(
        "/api/v1/kpi-links", json={"source_kpi_id": source_id, "target_kpi_id": target_b, "link_type": "constrains"}
    )
    assert resp_a.status_code == 201
    assert resp_b.status_code == 201

    resp = await client.get(f"/api/v1/kpi-links?kpi_id={source_id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_list_by_kpi_id_returns_links_as_source_or_target(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")
    c = await _create_kpi(client, "C")

    await client.post("/api/v1/kpi-links", json={"source_kpi_id": a, "target_kpi_id": b, "link_type": "contributes"})
    await client.post("/api/v1/kpi-links", json={"source_kpi_id": c, "target_kpi_id": b, "link_type": "depends_on"})

    resp = await client.get(f"/api/v1/kpi-links?kpi_id={b}")
    assert resp.status_code == 200
    ids = {(link["source_kpi_id"], link["target_kpi_id"]) for link in resp.json()}
    assert ids == {(a, b), (c, b)}


async def test_cycle_closing_link_is_created_as_usual(client: AsyncClient) -> None:
    """Cycles are allowed here; detection is Step 3c."""
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")

    forward = await client.post(
        "/api/v1/kpi-links", json={"source_kpi_id": a, "target_kpi_id": b, "link_type": "contributes"}
    )
    backward = await client.post(
        "/api/v1/kpi-links", json={"source_kpi_id": b, "target_kpi_id": a, "link_type": "contributes"}
    )
    assert forward.status_code == 201
    assert backward.status_code == 201


async def test_delete_link(client: AsyncClient) -> None:
    source_id = await _create_kpi(client, "Source")
    target_id = await _create_kpi(client, "Target")
    create = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "contributes"},
    )
    link_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/kpi-links/{link_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/kpi-links/{link_id}")
    assert resp.status_code == 404


async def test_delete_missing_link_returns_404(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/kpi-links/does-not-exist")
    assert resp.status_code == 404


async def test_link_dies_when_kpi_source_deleted_via_goal_patch(client: AsyncClient) -> None:
    goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goal",
            "owner": "alice@example.com",
            "kpis": [{"name": "Source", "target": 100, "unit": "USD"}],
        },
    )
    goal_id = goal.json()["id"]
    source_id = goal.json()["kpis"][0]["id"]
    target_id = await _create_kpi(client, "Target")

    link = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "contributes"},
    )
    link_id = link.json()["id"]

    # Diff-sync patch omitting the KPI deletes it (Step 3-0 behavior).
    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"kpis": []})
    assert resp.status_code == 200

    resp = await client.get(f"/api/v1/kpi-links/{link_id}")
    assert resp.status_code == 404


async def test_link_dies_when_goal_deleted_with_cascade(client: AsyncClient) -> None:
    goal = await client.post(
        "/api/v1/goals",
        json={
            "name": "Goal",
            "owner": "alice@example.com",
            "kpis": [{"name": "Source", "target": 100, "unit": "USD"}],
        },
    )
    goal_id = goal.json()["id"]
    source_id = goal.json()["kpis"][0]["id"]
    target_id = await _create_kpi(client, "Target")

    link = await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source_id, "target_kpi_id": target_id, "link_type": "contributes"},
    )
    link_id = link.json()["id"]

    resp = await client.delete(f"/api/v1/goals/{goal_id}?cascade=true")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/kpi-links/{link_id}")
    assert resp.status_code == 404
