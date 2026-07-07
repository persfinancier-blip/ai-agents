import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONType


class DecisionLifecycleStage(str, enum.Enum):
    """13-stage cycle from docs/full-vision/04_Simulation/Decision_Center.md section 3."""

    DISCOVERED = "discovered"
    ANALYZED = "analyzed"
    HYPOTHESES_FORMED = "hypotheses_formed"
    SCENARIOS_BUILT = "scenarios_built"
    SIMULATED = "simulated"
    RISK_ASSESSED = "risk_assessed"
    DECISION_SELECTED = "decision_selected"
    APPROVED = "approved"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    RESULT_EVALUATED = "result_evaluated"
    LESSONS_EXTRACTED = "lessons_extracted"
    ARCHIVED = "archived"


class DecisionType(str, enum.Enum):
    STRATEGIC = "strategic"
    TACTICAL = "tactical"
    OPERATIONAL = "operational"
    AUTOMATIC = "automatic"


class AutonomyLevel(str, enum.Enum):
    MANUAL = "manual"
    ASSISTED = "assisted"
    SUPERVISED_AI = "supervised_ai"
    AUTONOMOUS_AI = "autonomous_ai"


class Decision(Base):
    """Decision Canvas fields (docs/full-vision/04_Simulation/Decision_Center.md
    section 6), joined to its Entity row."""

    __tablename__ = "decision"

    entity_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)

    problem: Mapped[str] = mapped_column(String)
    goal: Mapped[str] = mapped_column(String)
    initiator: Mapped[str] = mapped_column(String(255))
    stakeholders: Mapped[list[str]] = mapped_column(JSONType, default=list)
    alternatives: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    constraints: Mapped[list[str]] = mapped_column(JSONType, default=list)
    assumptions: Mapped[list[str]] = mapped_column(JSONType, default=list)
    success_kpis: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_timeline_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    decision_type: Mapped[str] = mapped_column(String(20))
    autonomy_level: Mapped[str] = mapped_column(String(20), default=AutonomyLevel.MANUAL.value)

    final_decision: Mapped[str | None] = mapped_column(String, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_result: Mapped[str | None] = mapped_column(String, nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(String, nullable=True)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
