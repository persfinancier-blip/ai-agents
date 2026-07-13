import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class KpiFactor(Base):
    """A weighted contribution of one KPI (the factor) to another (the composite),
    Management_Model.md §9.12, ADR-0004 R4.

    Not an Entity subtype, same reasoning as KpiLink/KpiLinkCycle: this is a relation
    between two already-existing KPI entities, not a new graph node.

    computed_value = Σ weight * factor.target is a raw, un-normalized sum (ADR-0004's open
    question on weight normalization/unit reconciliation is deliberately not solved here) —
    computed on read in kpi_factor_service, not stored.

    A factor must itself have a numeric target (enforced at creation, not here): this is what
    keeps the factor graph acyclic — a composite KPI (target usually None) can never be used
    as someone else's factor, so recursive composites can't happen.
    """

    __tablename__ = "kpi_factor"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    composite_kpi_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), index=True)
    factor_kpi_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), index=True)
    weight: Mapped[float] = mapped_column(Float)
