from pydantic import BaseModel

from app.models.kpi_link import KpiLinkType


class KpiLinkCreate(BaseModel):
    source_kpi_id: str
    target_kpi_id: str
    link_type: KpiLinkType


class KpiLinkRead(BaseModel):
    id: str
    source_kpi_id: str
    target_kpi_id: str
    link_type: str
