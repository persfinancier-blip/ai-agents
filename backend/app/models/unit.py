import enum

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UnitKind(str, enum.Enum):
    """Atomic executor types (ADR-0006). Team/dept grouping is a future overlay, not a kind."""

    EMPLOYEE = "employee"
    AGENT = "agent"
    EXTERNAL = "external"
    DEVICE = "device"


class Unit(Base):
    """Unit as an Entity subtype (ADR-0006), joined to its Entity row, same pattern as Goal/Kpi.

    Name/description live on Entity, not here. Entity.owner is unused for units (platform field).
    """

    __tablename__ = "unit"

    entity_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))
