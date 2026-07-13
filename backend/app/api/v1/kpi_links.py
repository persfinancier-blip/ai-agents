from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.kpi_link_cycle import KpiLinkCycle
from app.schemas.kpi_link import KpiLinkCreate, KpiLinkRead
from app.schemas.kpi_link_cycle import KpiLinkCycleConfirm, KpiLinkCycleRead
from app.services import kpi_link_service
from app.services.kpi_link_service import DuplicateLinkError, KpiNotFoundError, SelfLinkError

router = APIRouter(prefix="/kpi-links", tags=["kpi-links"])


def _to_cycle_read(cycle: KpiLinkCycle) -> KpiLinkCycleRead:
    return KpiLinkCycleRead(
        id=cycle.id,
        member_kpi_ids=cycle.member_kpi_ids,
        member_link_ids=cycle.member_link_ids,
        confirmed=cycle.confirmed,
        judge_goal_id=cycle.judge_goal_id,
    )


@router.post("", response_model=KpiLinkRead, status_code=status.HTTP_201_CREATED)
async def create_link(payload: KpiLinkCreate, session: AsyncSession = Depends(get_session)) -> KpiLinkRead:
    try:
        link = await kpi_link_service.create_link(
            session, payload.source_kpi_id, payload.target_kpi_id, payload.link_type
        )
    except (KpiNotFoundError, SelfLinkError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except DuplicateLinkError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return kpi_link_service.to_kpi_link_read(link)


@router.get("", response_model=list[KpiLinkRead])
async def list_links(
    kpi_id: str | None = Query(default=None), session: AsyncSession = Depends(get_session)
) -> list[KpiLinkRead]:
    links = (
        await kpi_link_service.list_links_for_kpi(session, kpi_id)
        if kpi_id is not None
        else await kpi_link_service.list_links(session)
    )
    return [kpi_link_service.to_kpi_link_read(link) for link in links]


# NB: /cycles must be registered before /{link_id} — otherwise FastAPI would match
# GET /kpi-links/cycles against the dynamic {link_id} route first.
@router.get("/cycles", response_model=list[KpiLinkCycleRead])
async def list_cycles(session: AsyncSession = Depends(get_session)) -> list[KpiLinkCycleRead]:
    cycles = await kpi_link_service.list_cycles(session)
    return [_to_cycle_read(cycle) for cycle in cycles]


@router.patch("/cycles/{cycle_id}", response_model=KpiLinkCycleRead)
async def confirm_cycle(
    cycle_id: str, payload: KpiLinkCycleConfirm, session: AsyncSession = Depends(get_session)
) -> KpiLinkCycleRead:
    cycle = await kpi_link_service.set_cycle_confirmed(session, cycle_id, payload.confirmed)
    if cycle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI link cycle not found")
    return _to_cycle_read(cycle)


@router.get("/{link_id}", response_model=KpiLinkRead)
async def get_link(link_id: str, session: AsyncSession = Depends(get_session)) -> KpiLinkRead:
    link = await kpi_link_service.get_link(session, link_id)
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI link not found")
    return kpi_link_service.to_kpi_link_read(link)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(link_id: str, session: AsyncSession = Depends(get_session)) -> None:
    deleted = await kpi_link_service.delete_link(session, link_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KPI link not found")
