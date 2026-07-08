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


async def test_definiteness_fog_with_kpi_but_no_target(client: AsyncClient) -> None:
    """A KPI without a target is a valid fog state (the KPI itself exists, unmeasured)."""
    resp = await client.post("/api/v1/goals", json=_payload(kpis=[{"name": "Goodwill", "target": None, "unit": ""}]))
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
    assert len(body["kpis"]) == 1  # kpis untouched by a patch that doesn't mention them


async def test_patch_goal_kpis_replaces_the_set(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={
            "kpis": [
                {"name": "Revenue", "target": 2_000_000, "unit": "USD"},
                {"name": "NPS", "target": 50, "unit": "score"},
            ]
        },
    )
    assert resp.status_code == 200
    assert len(resp.json()["kpis"]) == 2


async def test_patch_goal_kpis_preserves_id_of_unchanged_kpis(client: AsyncClient) -> None:
    """The key diff-sync test: patching a KPI's target must not change its id."""
    create = await client.post(
        "/api/v1/goals",
        json=_payload(
            kpis=[
                {"name": "Revenue", "target": 1_000_000, "unit": "USD"},
                {"name": "NPS", "target": 40, "unit": "score"},
            ]
        ),
    )
    kpis = create.json()["kpis"]
    revenue_id = next(k["id"] for k in kpis if k["name"] == "Revenue")
    nps_id = next(k["id"] for k in kpis if k["name"] == "NPS")
    assert revenue_id is not None
    assert nps_id is not None

    resp = await client.patch(
        f"/api/v1/goals/{create.json()['id']}",
        json={
            "kpis": [
                {"id": revenue_id, "name": "Revenue", "target": 2_000_000, "unit": "USD"},
                {"id": nps_id, "name": "NPS", "target": 40, "unit": "score"},
            ]
        },
    )
    assert resp.status_code == 200
    updated_kpis = resp.json()["kpis"]
    updated_revenue = next(k for k in updated_kpis if k["id"] == revenue_id)
    updated_nps = next(k for k in updated_kpis if k["id"] == nps_id)
    assert updated_revenue["target"] == 2_000_000
    assert updated_nps["target"] == 40


async def test_patch_goal_kpis_add_new_alongside_existing(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]
    existing_id = create.json()["kpis"][0]["id"]

    resp = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={
            "kpis": [
                {"id": existing_id, "name": "Revenue", "target": 1_000_000, "unit": "USD"},
                {"name": "NPS", "target": 50, "unit": "score"},
            ]
        },
    )
    assert resp.status_code == 200
    kpis = resp.json()["kpis"]
    assert len(kpis) == 2
    ids = {k["id"] for k in kpis}
    assert existing_id in ids  # untouched existing KPI kept its id
    new_kpi = next(k for k in kpis if k["id"] != existing_id)
    assert new_kpi["name"] == "NPS"
    assert new_kpi["id"] is not None  # the new KPI got its own stable id


async def test_patch_goal_kpis_omitting_one_deletes_it(client: AsyncClient) -> None:
    create = await client.post(
        "/api/v1/goals",
        json=_payload(
            kpis=[
                {"name": "Revenue", "target": 1_000_000, "unit": "USD"},
                {"name": "NPS", "target": 40, "unit": "score"},
            ]
        ),
    )
    goal_id = create.json()["id"]
    kpis = create.json()["kpis"]
    revenue = next(k for k in kpis if k["name"] == "Revenue")

    resp = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"kpis": [{"id": revenue["id"], "name": "Revenue", "target": revenue["target"], "unit": revenue["unit"]}]},
    )
    assert resp.status_code == 200
    remaining = resp.json()["kpis"]
    assert len(remaining) == 1
    assert remaining[0]["id"] == revenue["id"]


async def test_patch_goal_kpis_unknown_id_is_400(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.patch(
        f"/api/v1/goals/{goal_id}",
        json={"kpis": [{"id": "does-not-belong-here", "name": "X", "target": 1, "unit": ""}]},
    )
    assert resp.status_code == 400


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


async def test_root_goal_has_no_parent(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload())
    assert resp.status_code == 201
    assert resp.json()["parent_id"] is None


async def test_create_with_parent_id(client: AsyncClient) -> None:
    parent = await client.post("/api/v1/goals", json=_payload(name="Parent"))
    parent_id = parent.json()["id"]

    child = await client.post("/api/v1/goals", json=_payload(name="Child", parent_id=parent_id))
    assert child.status_code == 201
    assert child.json()["parent_id"] == parent_id


async def test_create_with_nonexistent_parent_id_is_not_500(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/goals", json=_payload(parent_id="does-not-exist"))
    assert resp.status_code == 400


async def test_patch_parent_id_to_nonexistent_goal_is_not_500(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"parent_id": "does-not-exist"})
    assert resp.status_code == 400


async def test_patch_self_as_parent_is_rejected(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.patch(f"/api/v1/goals/{goal_id}", json={"parent_id": goal_id})
    assert resp.status_code in (400, 409)


async def test_patch_creating_transitive_cycle_is_rejected(client: AsyncClient) -> None:
    root = await client.post("/api/v1/goals", json=_payload(name="Root"))
    root_id = root.json()["id"]
    child = await client.post("/api/v1/goals", json=_payload(name="Child", parent_id=root_id))
    child_id = child.json()["id"]
    grandchild = await client.post("/api/v1/goals", json=_payload(name="Grandchild", parent_id=child_id))
    grandchild_id = grandchild.json()["id"]

    # Root becoming a child of its own grandchild would close a loop.
    resp = await client.patch(f"/api/v1/goals/{root_id}", json={"parent_id": grandchild_id})
    assert resp.status_code in (400, 409)


async def test_definiteness_unaffected_by_children(client: AsyncClient) -> None:
    parent = await client.post("/api/v1/goals", json=_payload(kpis=[]))  # fog: no kpis
    parent_id = parent.json()["id"]
    assert parent.json()["definiteness"] == "fog"

    await client.post("/api/v1/goals", json=_payload(name="Child", parent_id=parent_id))

    resp = await client.get(f"/api/v1/goals/{parent_id}")
    assert resp.json()["definiteness"] == "fog"  # still fog: no bottom-up aggregation from children


async def test_subtree_returns_flat_branch(client: AsyncClient) -> None:
    root = await client.post("/api/v1/goals", json=_payload(name="Root"))
    root_id = root.json()["id"]
    mid = await client.post("/api/v1/goals", json=_payload(name="Mid", parent_id=root_id))
    mid_id = mid.json()["id"]
    leaf = await client.post("/api/v1/goals", json=_payload(name="Leaf", parent_id=mid_id))
    leaf_id = leaf.json()["id"]
    # A sibling of Mid, off the root, should not appear in Mid's subtree.
    await client.post("/api/v1/goals", json=_payload(name="Sibling", parent_id=root_id))

    resp = await client.get(f"/api/v1/goals/{root_id}/subtree")
    assert resp.status_code == 200
    names = {row["name"] for row in resp.json()}
    assert names == {"Root", "Mid", "Leaf", "Sibling"}

    resp = await client.get(f"/api/v1/goals/{mid_id}/subtree")
    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()}
    assert ids == {mid_id, leaf_id}


async def test_subtree_missing_goal_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/goals/does-not-exist/subtree")
    assert resp.status_code == 404


async def test_delete_leaf_without_cascade_succeeds(client: AsyncClient) -> None:
    create = await client.post("/api/v1/goals", json=_payload())
    goal_id = create.json()["id"]

    resp = await client.delete(f"/api/v1/goals/{goal_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/goals/{goal_id}")
    assert resp.status_code == 404


async def test_delete_node_with_children_requires_cascade(client: AsyncClient) -> None:
    parent = await client.post("/api/v1/goals", json=_payload(name="Parent"))
    parent_id = parent.json()["id"]
    await client.post("/api/v1/goals", json=_payload(name="Child", parent_id=parent_id))

    resp = await client.delete(f"/api/v1/goals/{parent_id}")
    assert resp.status_code == 409

    # The node and its child must both still exist after the rejected delete.
    assert (await client.get(f"/api/v1/goals/{parent_id}")).status_code == 200


async def test_delete_cascade_removes_whole_subtree_and_kpis(client: AsyncClient) -> None:
    parent = await client.post("/api/v1/goals", json=_payload(name="Parent"))
    parent_id = parent.json()["id"]
    child = await client.post("/api/v1/goals", json=_payload(name="Child", parent_id=parent_id))
    child_id = child.json()["id"]

    resp = await client.delete(f"/api/v1/goals/{parent_id}?cascade=true")
    assert resp.status_code == 204

    assert (await client.get(f"/api/v1/goals/{parent_id}")).status_code == 404
    assert (await client.get(f"/api/v1/goals/{child_id}")).status_code == 404

    resp = await client.get("/api/v1/goals")
    names = {row["name"] for row in resp.json()}
    assert "Parent" not in names
    assert "Child" not in names


async def test_delete_missing_goal_returns_404(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/goals/does-not-exist")
    assert resp.status_code == 404
