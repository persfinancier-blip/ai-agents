from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.llm.factory import get_llm_provider
from app.llm.provider import LLMProvider
from app.schemas.board import BoardOpinionRead
from app.schemas.decision import DecisionCreate, DecisionPatch, DecisionRead
from app.services import board_service, decision_service
from app.services.decision_service import DecisionAlreadyDecidedError

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post("", response_model=DecisionRead, status_code=status.HTTP_201_CREATED)
async def create_decision(payload: DecisionCreate, session: AsyncSession = Depends(get_session)) -> DecisionRead:
    entity, decision = await decision_service.create_decision(session, payload)
    return decision_service.to_decision_read(entity, decision)


@router.get("", response_model=list[DecisionRead])
async def list_decisions(session: AsyncSession = Depends(get_session)) -> list[DecisionRead]:
    rows = await decision_service.list_decisions(session)
    return [decision_service.to_decision_read(entity, decision) for entity, decision in rows]


@router.get("/{decision_id}", response_model=DecisionRead)
async def get_decision(decision_id: str, session: AsyncSession = Depends(get_session)) -> DecisionRead:
    row = await decision_service.get_decision(session, decision_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    entity, decision = row
    return decision_service.to_decision_read(entity, decision)


@router.post("/{decision_id}/analyze", response_model=BoardOpinionRead, status_code=status.HTTP_201_CREATED)
async def analyze_decision(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
    provider: LLMProvider = Depends(get_llm_provider),
) -> BoardOpinionRead:
    """v0: runs the CFO persona only. M3 adds COO/CTO + synthesis behind this same endpoint."""
    row = await decision_service.get_decision(session, decision_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    _entity, decision = row
    opinion = await board_service.analyze_decision(session, decision, provider)
    return board_service.to_board_opinion_read(opinion)


@router.get("/{decision_id}/board", response_model=list[BoardOpinionRead])
async def get_board(decision_id: str, session: AsyncSession = Depends(get_session)) -> list[BoardOpinionRead]:
    row = await decision_service.get_decision(session, decision_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    opinions = await board_service.list_board_opinions(session, decision_id)
    return [board_service.to_board_opinion_read(o) for o in opinions]


@router.patch("/{decision_id}", response_model=DecisionRead)
async def patch_decision(
    decision_id: str, payload: DecisionPatch, session: AsyncSession = Depends(get_session)
) -> DecisionRead:
    try:
        row = await decision_service.patch_decision(session, decision_id, payload)
    except DecisionAlreadyDecidedError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision not found")
    entity, decision = row
    return decision_service.to_decision_read(entity, decision)
