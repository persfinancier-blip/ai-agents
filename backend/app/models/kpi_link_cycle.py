import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import JSONType


def _uuid() -> str:
    return str(uuid.uuid4())


class KpiLinkCycle(Base):
    """A persisted elementary cycle in the kpi_link graph (Management_Model.md §9.11, ADR-0004 R3).

    Recomputed in full on every kpi_link mutation (kpi_link_service.sync_cycles) — same
    "cheap enough to redo from scratch" argument as ADR-0002 §7.7. Persisting rather than
    computing on read gives the manual `confirmed` flag a stable row to attach to; when a
    cycle's node set changes (even by one edge), it's a new row and `confirmed` resets.

    Not an Entity subtype, for the same reason as KpiLink itself: this is derived graph
    state, not a platform node.
    """

    __tablename__ = "kpi_link_cycle"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    canonical_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    member_kpi_ids: Mapped[list[str]] = mapped_column(JSONType)
    member_link_ids: Mapped[list[str]] = mapped_column(JSONType)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    judge_goal_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("entity.id"), nullable=True)
