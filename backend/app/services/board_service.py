from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.board.personas import get_cfo_opinion
from app.llm.provider import LLMProvider
from app.models.board_opinion import BoardOpinion, Persona
from app.models.decision import Decision
from app.schemas.board import BoardOpinionRead


def to_board_opinion_read(row: BoardOpinion) -> BoardOpinionRead:
    return BoardOpinionRead(
        id=row.id,
        decision_id=row.decision_id,
        persona=row.persona,
        recommendation=row.recommendation,
        confidence=row.confidence,
        key_risks=row.key_risks,
        key_benefits=row.key_benefits,
        rationale=row.rationale,
        created_at=row.created_at,
    )


async def analyze_decision(session: AsyncSession, decision: Decision, provider: LLMProvider) -> BoardOpinion:
    """v0: CFO only. M3 adds COO/CTO + a synthesis step alongside this."""
    opinion = await get_cfo_opinion(provider, decision)
    row = BoardOpinion(
        decision_id=decision.entity_id,
        persona=Persona.CFO.value,
        recommendation=opinion.recommendation,
        confidence=opinion.confidence,
        key_risks=opinion.key_risks,
        key_benefits=opinion.key_benefits,
        rationale=opinion.rationale,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def list_board_opinions(session: AsyncSession, decision_id: str) -> list[BoardOpinion]:
    result = await session.execute(
        select(BoardOpinion).where(BoardOpinion.decision_id == decision_id).order_by(BoardOpinion.created_at)
    )
    return list(result.scalars().all())
