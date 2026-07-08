from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Kpi(Base):
    """KPI as a first-class Entity subtype (Management_Model.md §9.1), joined to its Entity row.

    Name/description live on Entity, not here (same split as Goal/Decision).
    `target=None` is a valid state — a KPI without a target keeps its goal in fog.
    """

    __tablename__ = "kpi"

    entity_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)
    goal_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), index=True)
    target: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(50), default="")
