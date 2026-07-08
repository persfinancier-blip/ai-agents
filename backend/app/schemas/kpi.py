from datetime import datetime

from pydantic import BaseModel


class KpiRead(BaseModel):
    """Full KPI-as-Entity representation; internal for now, becomes the Step 3 KPI endpoint response."""

    id: str
    entity_type: str
    name: str
    description: str | None
    goal_id: str
    target: float | None
    unit: str
    created_at: datetime
    updated_at: datetime
