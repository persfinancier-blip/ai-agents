import enum

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UnitGroupKind(str, enum.Enum):
    """Two grouping overlays with different membership semantics (ADR-0007)."""

    DEPARTMENT = "department"
    TEAM = "team"


class UnitGroup(Base):
    """Group as an Entity subtype (ADR-0007), same pattern as Unit/Goal/Kpi.

    Name/description live on Entity, not here. `parent_id` is used for department
    nesting only (one home per unit); teams are flat in this slice.
    """

    __tablename__ = "unit_group"

    entity_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("unit_group.entity_id"), nullable=True, index=True
    )


class TeamMembership(Base):
    """Many-to-many overlay: a unit may belong to any number of teams (ADR-0007)."""

    __tablename__ = "team_membership"

    team_id: Mapped[str] = mapped_column(String(36), ForeignKey("unit_group.entity_id"), primary_key=True)
    unit_id: Mapped[str] = mapped_column(String(36), ForeignKey("unit.entity_id"), primary_key=True)
