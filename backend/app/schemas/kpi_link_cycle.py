from pydantic import BaseModel


class KpiLinkCycleRead(BaseModel):
    id: str
    member_kpi_ids: list[str]
    member_link_ids: list[str]
    confirmed: bool
    judge_goal_id: str | None


class KpiLinkCycleConfirm(BaseModel):
    confirmed: bool
