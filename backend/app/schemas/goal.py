from datetime import datetime

from pydantic import BaseModel, Field

from app.models.goal import RoleLabel


class GoalKpi(BaseModel):
    id: str | None = None
    name: str
    target: float | None
    unit: str
    computed_value: float | None = None  # read-only: filled by to_goal_read for composite KPIs; ignored on create/patch


class GoalCreate(BaseModel):
    name: str
    owner: str = ""
    role_label: RoleLabel = RoleLabel.OWNER
    description: str | None = None
    kpis: list[GoalKpi] = Field(default_factory=list)
    parent_id: str | None = None


class GoalPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    owner: str | None = None
    role_label: RoleLabel | None = None
    kpis: list[GoalKpi] | None = None
    is_backlog: bool | None = None
    parent_id: str | None = None


class GoalRead(BaseModel):
    id: str
    entity_type: str
    name: str
    description: str | None
    owner: str
    status: str
    lifecycle_stage: str
    risk_level: str

    role_label: str
    kpis: list[GoalKpi]
    is_backlog: bool
    definiteness: str
    parent_id: str | None

    created_at: datetime
    updated_at: datetime
