from datetime import datetime

from pydantic import BaseModel, Field


class BoardOpinionOutput(BaseModel):
    """Schema a persona's LLM call must fill in (forced tool-use, never prompt-only JSON)."""

    recommendation: str
    confidence: float = Field(ge=0, le=1)
    key_risks: list[str] = Field(default_factory=list)
    key_benefits: list[str] = Field(default_factory=list)
    rationale: str


class BoardOpinionRead(BaseModel):
    id: int
    decision_id: str
    persona: str
    recommendation: str
    confidence: float
    key_risks: list[str]
    key_benefits: list[str]
    rationale: str
    created_at: datetime
