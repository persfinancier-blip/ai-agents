import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONType


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ScenarioType(str, enum.Enum):
    BEST = "best"
    EXPECTED = "expected"
    WORST = "worst"


class ScenarioMethod(str, enum.Enum):
    """LLM_QUALITATIVE is the only method implemented until a real Monte Carlo
    engine lands (M4+); the column exists now so consumers don't change later."""

    LLM_QUALITATIVE = "llm_qualitative"
    MONTE_CARLO = "monte_carlo"


class Scenario(Base):
    """Best/expected/worst projection for a Decision. Unused until M4."""

    __tablename__ = "scenario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(36), ForeignKey("decision.entity_id"), index=True)
    scenario_type: Mapped[str] = mapped_column(String(20))
    narrative: Mapped[str] = mapped_column(String)
    kpi_impact: Mapped[dict] = mapped_column(JSONType, default=dict)
    cost_impact: Mapped[float | None] = mapped_column(Float, nullable=True)
    timeline_impact_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    probability_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    method: Mapped[str] = mapped_column(String(20), default=ScenarioMethod.LLM_QUALITATIVE.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
