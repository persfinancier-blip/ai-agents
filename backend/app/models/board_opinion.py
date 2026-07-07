import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONType


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Persona(str, enum.Enum):
    """v0 ships 3 of the 7 personas in docs/full-vision/04_Simulation/Decision_Center.md section 10."""

    CFO = "cfo"
    COO = "coo"
    CTO = "cto"


class BoardOpinion(Base):
    """One AI persona's structured opinion on a Decision. Unused until M2."""

    __tablename__ = "board_opinion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(36), ForeignKey("decision.entity_id"), index=True)
    persona: Mapped[str] = mapped_column(String(20))
    recommendation: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column(Float)
    key_risks: Mapped[list[str]] = mapped_column(JSONType, default=list)
    key_benefits: Mapped[list[str]] = mapped_column(JSONType, default=list)
    rationale: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
