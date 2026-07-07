from datetime import datetime

from pydantic import BaseModel, Field

from app.models.decision import AutonomyLevel, DecisionType


class Alternative(BaseModel):
    name: str
    description: str


class SuccessKpi(BaseModel):
    name: str
    target: str
    unit: str


class DecisionCreate(BaseModel):
    name: str
    owner: str
    problem: str
    goal: str
    initiator: str
    decision_type: DecisionType = DecisionType.OPERATIONAL
    autonomy_level: AutonomyLevel = AutonomyLevel.MANUAL
    description: str | None = None
    stakeholders: list[str] = Field(default_factory=list)
    alternatives: list[Alternative] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    success_kpis: list[SuccessKpi] = Field(default_factory=list)
    estimated_cost: float | None = None
    estimated_timeline_days: int | None = None


class DecisionPatch(BaseModel):
    """Editing the canvas is only allowed before a final decision is recorded."""

    name: str | None = None
    description: str | None = None
    problem: str | None = None
    goal: str | None = None
    stakeholders: list[str] | None = None
    alternatives: list[Alternative] | None = None
    constraints: list[str] | None = None
    assumptions: list[str] | None = None
    success_kpis: list[SuccessKpi] | None = None
    estimated_cost: float | None = None
    estimated_timeline_days: int | None = None


class DecisionRead(BaseModel):
    id: str
    entity_type: str
    name: str
    description: str | None
    owner: str
    status: str
    lifecycle_stage: str
    risk_level: str

    problem: str
    goal: str
    initiator: str
    stakeholders: list[str]
    alternatives: list[Alternative]
    constraints: list[str]
    assumptions: list[str]
    success_kpis: list[SuccessKpi]
    estimated_cost: float | None
    estimated_timeline_days: int | None
    decision_type: str
    autonomy_level: str

    final_decision: str | None
    decided_by: str | None
    decided_at: datetime | None
    actual_result: str | None
    lessons_learned: str | None
    evaluated_at: datetime | None

    created_at: datetime
    updated_at: datetime
