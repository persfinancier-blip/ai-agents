import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class KpiLinkType(str, enum.Enum):
    CONTRIBUTES = "contributes"
    CONSTRAINS = "constrains"
    DEPENDS_ON = "depends_on"


class KpiLink(Base):
    """A directed edge between two KPI entities (Management_Model.md §9.9-9.10, ADR-0004 R1).

    Deliberately NOT an Entity subtype: KPIs are the graph's nodes, this is just an edge
    (source, target, type) — giving it full Entity plumbing (owner/lifecycle/status/...)
    would be pointless for something with no identity beyond the pair it connects.

    No DB-level ON DELETE CASCADE: the project cleans up Goal/Kpi rows by hand in service
    code, and links follow the same convention (see kpi_link_service.delete_links_for_kpi,
    called from kpi_service.delete_kpi so a link dies with either of its ends per ADR-0004 R2).
    """

    __tablename__ = "kpi_link"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source_kpi_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), index=True)
    target_kpi_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), index=True)
    link_type: Mapped[str] = mapped_column(String(20))
