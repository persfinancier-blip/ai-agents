from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entity import Entity
from app.models.goal import Goal
from app.models.kpi import Kpi
from app.models.kpi_link import KpiLink, KpiLinkType
from app.models.kpi_link_cycle import KpiLinkCycle
from app.schemas.kpi_link import KpiLinkRead


class KpiNotFoundError(Exception):
    """Raised when a link references a source/target id that isn't an existing KPI."""


class SelfLinkError(Exception):
    """Raised when source_kpi_id == target_kpi_id."""


class DuplicateLinkError(Exception):
    """Raised when a (source, target, link_type) triple already exists."""


@dataclass
class Cycle:
    """One elementary cycle, already normalized (rotated to start at the smallest kpi id)."""

    member_kpi_ids: list[str]
    member_link_ids: list[str]
    canonical_key: str


def to_kpi_link_read(link: KpiLink) -> KpiLinkRead:
    return KpiLinkRead(
        id=link.id,
        source_kpi_id=link.source_kpi_id,
        target_kpi_id=link.target_kpi_id,
        link_type=link.link_type,
    )


async def _kpi_exists(session: AsyncSession, kpi_id: str) -> bool:
    result = await session.execute(select(Entity.id).where(Entity.id == kpi_id, Entity.entity_type == "kpi"))
    return result.scalar_one_or_none() is not None


async def create_link(session: AsyncSession, source_kpi_id: str, target_kpi_id: str, link_type: KpiLinkType) -> KpiLink:
    """Cycles are not blocked here — a link that closes a loop is created as usual; sync_cycles
    below records it in kpi_link_cycle for later review (Step 3c), it just isn't rejected.
    """
    if source_kpi_id == target_kpi_id:
        raise SelfLinkError("A KPI cannot link to itself")
    if not await _kpi_exists(session, source_kpi_id):
        raise KpiNotFoundError(f"KPI {source_kpi_id} does not exist")
    if not await _kpi_exists(session, target_kpi_id):
        raise KpiNotFoundError(f"KPI {target_kpi_id} does not exist")

    existing = await session.execute(
        select(KpiLink).where(
            KpiLink.source_kpi_id == source_kpi_id,
            KpiLink.target_kpi_id == target_kpi_id,
            KpiLink.link_type == link_type.value,
        )
    )
    if existing.scalars().first() is not None:
        raise DuplicateLinkError(f"Link {source_kpi_id} -> {target_kpi_id} ({link_type.value}) already exists")

    link = KpiLink(source_kpi_id=source_kpi_id, target_kpi_id=target_kpi_id, link_type=link_type.value)
    session.add(link)
    await session.flush()  # populate link.id, and let sync_cycles see this new edge

    await sync_cycles(session)

    await session.commit()
    await session.refresh(link)
    return link


async def get_link(session: AsyncSession, link_id: str) -> KpiLink | None:
    result = await session.execute(select(KpiLink).where(KpiLink.id == link_id))
    return result.scalar_one_or_none()


async def list_links(session: AsyncSession) -> list[KpiLink]:
    result = await session.execute(select(KpiLink))
    return list(result.scalars().all())


async def list_links_for_kpi(session: AsyncSession, kpi_id: str) -> list[KpiLink]:
    """Links where kpi_id is either endpoint (source or target)."""
    result = await session.execute(
        select(KpiLink).where(or_(KpiLink.source_kpi_id == kpi_id, KpiLink.target_kpi_id == kpi_id))
    )
    return list(result.scalars().all())


async def delete_link(session: AsyncSession, link_id: str) -> bool:
    link = await get_link(session, link_id)
    if link is None:
        return False
    await session.delete(link)
    await session.flush()

    await sync_cycles(session)

    await session.commit()
    return True


async def delete_links_for_kpi(session: AsyncSession, kpi_id: str) -> None:
    """ADR-0004 R2: a link dies with either of its ends. Flushes but does not commit —
    called from kpi_service.delete_kpi, which owns the transaction boundary.
    """
    links = await list_links_for_kpi(session, kpi_id)
    for link in links:
        await session.delete(link)
    await session.flush()  # so sync_cycles below sees the graph without these links

    await sync_cycles(session)


def find_cycles(links: list[KpiLink]) -> list[Cycle]:
    """All elementary cycles in the directed graph formed by links, deduplicated by identity.

    DFS from every node, tracking the current simple path; closing back on the start node
    records a cycle. The same physical cycle is found once per member node (and, with
    parallel edges between the same pair, potentially via different edges) — normalizing
    each raw find to start at its lexicographically smallest kpi id and deduplicating by
    that key collapses same-node rediscoveries. Parallel-edge cycles over the same node set
    are a rare edge case (ADR-0004): not specially handled, one representative survives.
    """
    adjacency: dict[str, list[tuple[str, str]]] = {}
    nodes: set[str] = set()
    for link in links:
        adjacency.setdefault(link.source_kpi_id, []).append((link.target_kpi_id, link.id))
        nodes.add(link.source_kpi_id)
        nodes.add(link.target_kpi_id)

    raw_cycles: list[tuple[list[str], list[str]]] = []

    def dfs(start: str, current: str, path_nodes: list[str], path_links: list[str], on_path: set[str]) -> None:
        for neighbor, link_id in adjacency.get(current, []):
            if neighbor == start:
                raw_cycles.append((list(path_nodes), path_links + [link_id]))
            elif neighbor not in on_path:
                on_path.add(neighbor)
                path_nodes.append(neighbor)
                path_links.append(link_id)
                dfs(start, neighbor, path_nodes, path_links, on_path)
                path_links.pop()
                path_nodes.pop()
                on_path.remove(neighbor)

    for start in sorted(nodes):
        dfs(start, start, [start], [], {start})

    seen: dict[str, Cycle] = {}
    for kpi_ids, link_ids in raw_cycles:
        min_index = min(range(len(kpi_ids)), key=lambda i: kpi_ids[i])
        rotated_kpi_ids = kpi_ids[min_index:] + kpi_ids[:min_index]
        rotated_link_ids = link_ids[min_index:] + link_ids[:min_index]
        canonical_key = "->".join(rotated_kpi_ids)
        if canonical_key not in seen:
            seen[canonical_key] = Cycle(
                member_kpi_ids=rotated_kpi_ids, member_link_ids=rotated_link_ids, canonical_key=canonical_key
            )

    return list(seen.values())


async def _goal_ancestor_chain(session: AsyncSession, goal_id: str) -> list[str]:
    """goal_id followed by its ancestors up to the root, closest first.

    Same walk pattern as goal_service.would_create_cycle/get_subtree (walk up via
    goal.parent_id); kept local here rather than imported to avoid a service import cycle
    (goal_service -> kpi_service -> kpi_link_service).
    """
    chain: list[str] = []
    current_id: str | None = goal_id
    visited: set[str] = set()
    while current_id is not None and current_id not in visited:
        visited.add(current_id)
        chain.append(current_id)
        result = await session.execute(select(Goal.parent_id).where(Goal.entity_id == current_id))
        current_id = result.scalar_one_or_none()
    return chain


async def _find_cycle_judge(session: AsyncSession, member_kpi_ids: list[str]) -> str | None:
    """Nearest common structural ancestor (by goal.parent_id) of the goals owning the cycle's
    KPIs. None if the KPIs' goals share no ancestor — a legitimate state, not an error.
    """
    goal_ids = []
    for kpi_id in member_kpi_ids:
        result = await session.execute(select(Kpi.goal_id).where(Kpi.entity_id == kpi_id))
        goal_id = result.scalar_one_or_none()
        if goal_id is not None:
            goal_ids.append(goal_id)

    if not goal_ids:
        return None

    chains = [await _goal_ancestor_chain(session, gid) for gid in goal_ids]
    other_sets = [set(chain) for chain in chains[1:]]
    for ancestor in chains[0]:
        if all(ancestor in other for other in other_sets):
            return ancestor
    return None


async def list_cycles(session: AsyncSession) -> list[KpiLinkCycle]:
    result = await session.execute(select(KpiLinkCycle))
    return list(result.scalars().all())


async def get_cycle(session: AsyncSession, cycle_id: str) -> KpiLinkCycle | None:
    result = await session.execute(select(KpiLinkCycle).where(KpiLinkCycle.id == cycle_id))
    return result.scalar_one_or_none()


async def set_cycle_confirmed(session: AsyncSession, cycle_id: str, confirmed: bool) -> KpiLinkCycle | None:
    cycle = await get_cycle(session, cycle_id)
    if cycle is None:
        return None
    cycle.confirmed = confirmed
    await session.commit()
    await session.refresh(cycle)
    return cycle


async def sync_cycles(session: AsyncSession) -> None:
    """Recompute all elementary cycles from scratch and diff against persisted kpi_link_cycle
    rows: matching canonical_key rows are updated in place (confirmed flag preserved),
    vanished cycles are deleted, new cycles are created with confirmed=False. Flushes but
    does not commit — callers own the transaction boundary.
    """
    current_cycles = find_cycles(await list_links(session))
    current_by_key = {c.canonical_key: c for c in current_cycles}
    existing_by_key = {row.canonical_key: row for row in await list_cycles(session)}

    for key, row in existing_by_key.items():
        if key not in current_by_key:
            await session.delete(row)

    for key, cycle in current_by_key.items():
        judge_goal_id = await _find_cycle_judge(session, cycle.member_kpi_ids)
        if key in existing_by_key:
            row = existing_by_key[key]
            row.member_kpi_ids = cycle.member_kpi_ids
            row.member_link_ids = cycle.member_link_ids
            row.judge_goal_id = judge_goal_id
        else:
            session.add(
                KpiLinkCycle(
                    canonical_key=key,
                    member_kpi_ids=cycle.member_kpi_ids,
                    member_link_ids=cycle.member_link_ids,
                    confirmed=False,
                    judge_goal_id=judge_goal_id,
                )
            )

    await session.flush()
