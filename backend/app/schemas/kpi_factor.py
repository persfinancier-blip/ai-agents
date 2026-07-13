from pydantic import BaseModel


class KpiFactorCreate(BaseModel):
    composite_kpi_id: str
    factor_kpi_id: str
    weight: float


class KpiFactorRead(BaseModel):
    id: str
    composite_kpi_id: str
    factor_kpi_id: str
    weight: float
