from httpx import AsyncClient


async def _create_goal_with_kpi(client: AsyncClient, name: str, parent_id: str | None = None) -> tuple[str, str]:
    payload = {
        "name": f"Goal for {name}",
        "owner": "alice@example.com",
        "kpis": [{"name": name, "target": 100, "unit": "USD"}],
    }
    if parent_id is not None:
        payload["parent_id"] = parent_id
    resp = await client.post("/api/v1/goals", json=payload)
    body = resp.json()
    return body["id"], body["kpis"][0]["id"]


async def _create_kpi(client: AsyncClient, name: str = "Revenue") -> str:
    _goal_id, kpi_id = await _create_goal_with_kpi(client, name)
    return kpi_id


async def _link(client: AsyncClient, source: str, target: str, link_type: str = "contributes"):
    return await client.post(
        "/api/v1/kpi-links",
        json={"source_kpi_id": source, "target_kpi_id": target, "link_type": link_type},
    )


async def test_two_node_cycle_appears_after_second_link(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")

    resp = await client.get("/api/v1/kpi-links/cycles")
    assert resp.json() == []

    await _link(client, a, b)
    resp = await client.get("/api/v1/kpi-links/cycles")
    assert resp.json() == []  # no cycle yet, just one edge

    await _link(client, b, a)
    resp = await client.get("/api/v1/kpi-links/cycles")
    cycles = resp.json()
    assert len(cycles) == 1
    assert set(cycles[0]["member_kpi_ids"]) == {a, b}
    assert cycles[0]["confirmed"] is False


async def test_three_node_cycle_appears(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")
    c = await _create_kpi(client, "C")

    await _link(client, a, b)
    await _link(client, b, c)
    resp = await client.get("/api/v1/kpi-links/cycles")
    assert resp.json() == []

    await _link(client, c, a)
    resp = await client.get("/api/v1/kpi-links/cycles")
    cycles = resp.json()
    assert len(cycles) == 1
    assert set(cycles[0]["member_kpi_ids"]) == {a, b, c}


async def test_deleting_link_removes_cycle(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")

    forward = await _link(client, a, b)
    await _link(client, b, a)
    assert len((await client.get("/api/v1/kpi-links/cycles")).json()) == 1

    await client.delete(f"/api/v1/kpi-links/{forward.json()['id']}")
    assert (await client.get("/api/v1/kpi-links/cycles")).json() == []


async def test_confirming_cycle_survives_unrelated_change(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")
    c = await _create_kpi(client, "C")

    await _link(client, a, b)
    await _link(client, b, a)
    cycle = (await client.get("/api/v1/kpi-links/cycles")).json()[0]

    confirm = await client.patch(f"/api/v1/kpi-links/cycles/{cycle['id']}", json={"confirmed": True})
    assert confirm.status_code == 200
    assert confirm.json()["confirmed"] is True

    # Unrelated link, doesn't touch the cycle's nodes/edges.
    await _link(client, a, c)

    cycles = (await client.get("/api/v1/kpi-links/cycles")).json()
    assert len(cycles) == 1
    assert cycles[0]["id"] == cycle["id"]
    assert cycles[0]["confirmed"] is True


async def test_breaking_and_recreating_cycle_resets_confirmed(client: AsyncClient) -> None:
    a = await _create_kpi(client, "A")
    b = await _create_kpi(client, "B")

    forward = await _link(client, a, b)
    await _link(client, b, a)
    cycle = (await client.get("/api/v1/kpi-links/cycles")).json()[0]
    await client.patch(f"/api/v1/kpi-links/cycles/{cycle['id']}", json={"confirmed": True})

    await client.delete(f"/api/v1/kpi-links/{forward.json()['id']}")
    assert (await client.get("/api/v1/kpi-links/cycles")).json() == []

    await _link(client, a, b)
    new_cycles = (await client.get("/api/v1/kpi-links/cycles")).json()
    assert len(new_cycles) == 1
    assert new_cycles[0]["confirmed"] is False  # new row, new identity — not the old confirmation


async def test_judge_is_nearest_common_structural_ancestor(client: AsyncClient) -> None:
    root_id, _root_kpi = await _create_goal_with_kpi(client, "Root")
    _child1_id, kpi1 = await _create_goal_with_kpi(client, "Child1", parent_id=root_id)
    _child2_id, kpi2 = await _create_goal_with_kpi(client, "Child2", parent_id=root_id)

    await _link(client, kpi1, kpi2)
    await _link(client, kpi2, kpi1)

    cycles = (await client.get("/api/v1/kpi-links/cycles")).json()
    assert len(cycles) == 1
    assert cycles[0]["judge_goal_id"] == root_id


async def test_judge_is_none_for_unrelated_branches(client: AsyncClient) -> None:
    _goal_a, kpi_a = await _create_goal_with_kpi(client, "A")
    _goal_b, kpi_b = await _create_goal_with_kpi(client, "B")

    await _link(client, kpi_a, kpi_b)
    await _link(client, kpi_b, kpi_a)

    cycles = (await client.get("/api/v1/kpi-links/cycles")).json()
    assert len(cycles) == 1
    assert cycles[0]["judge_goal_id"] is None


async def test_confirm_missing_cycle_returns_404(client: AsyncClient) -> None:
    resp = await client.patch("/api/v1/kpi-links/cycles/does-not-exist", json={"confirmed": True})
    assert resp.status_code == 404


async def test_deleting_kpi_in_confirmed_cycle_removes_link_and_cycle(client: AsyncClient) -> None:
    goal_id, kpi_a = await _create_goal_with_kpi(client, "A")
    kpi_b = await _create_kpi(client, "B")

    await _link(client, kpi_a, kpi_b)
    await _link(client, kpi_b, kpi_a)
    cycle = (await client.get("/api/v1/kpi-links/cycles")).json()[0]
    await client.patch(f"/api/v1/kpi-links/cycles/{cycle['id']}", json={"confirmed": True})

    # Diff-sync patch omitting kpi_a's KPI deletes it (Step 3-0 behavior), which must cascade
    # through kpi_service.delete_kpi -> kpi_link_service.delete_links_for_kpi -> sync_cycles.
    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"kpis": []})
    assert resp.status_code == 200

    assert (await client.get("/api/v1/kpi-links/cycles")).json() == []
    remaining_links = (await client.get(f"/api/v1/kpi-links?kpi_id={kpi_b}")).json()
    assert remaining_links == []
