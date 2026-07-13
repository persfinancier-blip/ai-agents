from app.models.kpi_link import KpiLink
from app.services.kpi_link_service import find_cycles


def _link(link_id: str, source: str, target: str) -> KpiLink:
    return KpiLink(id=link_id, source_kpi_id=source, target_kpi_id=target, link_type="contributes")


def test_find_cycles_empty_graph() -> None:
    assert find_cycles([]) == []


def test_find_cycles_no_cycle() -> None:
    links = [_link("l1", "a", "b"), _link("l2", "b", "c")]
    assert find_cycles(links) == []


def test_find_cycles_single_two_node_cycle() -> None:
    links = [_link("l1", "a", "b"), _link("l2", "b", "a")]
    cycles = find_cycles(links)
    assert len(cycles) == 1
    assert cycles[0].member_kpi_ids == ["a", "b"]
    assert cycles[0].member_link_ids == ["l1", "l2"]
    assert cycles[0].canonical_key == "a->b"


def test_find_cycles_single_three_node_cycle() -> None:
    links = [_link("l1", "a", "b"), _link("l2", "b", "c"), _link("l3", "c", "a")]
    cycles = find_cycles(links)
    assert len(cycles) == 1
    assert cycles[0].member_kpi_ids == ["a", "b", "c"]
    assert cycles[0].member_link_ids == ["l1", "l2", "l3"]


def test_find_cycles_two_independent_cycles() -> None:
    links = [
        _link("l1", "a", "b"),
        _link("l2", "b", "a"),
        _link("l3", "x", "y"),
        _link("l4", "y", "x"),
    ]
    cycles = find_cycles(links)
    keys = {c.canonical_key for c in cycles}
    assert keys == {"a->b", "x->y"}


def test_find_cycles_normalization_is_independent_of_start_node() -> None:
    """Same physical cycle, described starting from each of its three members, must produce
    an identical canonical_key regardless of which node the underlying edges happen to list first."""
    starting_at_a = [_link("l1", "a", "b"), _link("l2", "b", "c"), _link("l3", "c", "a")]
    starting_at_b = [_link("l2", "b", "c"), _link("l3", "c", "a"), _link("l1", "a", "b")]

    key_a = find_cycles(starting_at_a)[0].canonical_key
    key_b = find_cycles(starting_at_b)[0].canonical_key
    assert key_a == key_b == "a->b->c"


def test_find_cycles_no_false_positive_from_shared_node_without_cycle() -> None:
    """b has two outgoing edges (to c and to d); neither closes a loop back to a."""
    links = [_link("l1", "a", "b"), _link("l2", "b", "c"), _link("l3", "b", "d")]
    assert find_cycles(links) == []
