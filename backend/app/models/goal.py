import enum

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GoalLifecycleStage(str, enum.Enum):
    """Simplified lifecycle for goals (docs/full-vision/02_Product/PRD.md section 14.3)."""

    DRAFT = "draft"
    ACTIVE = "active"
    REVIEW = "review"
    ARCHIVED = "archived"


class RoleLabel(str, enum.Enum):
    """Pure responsibility semantics, no permission model (ADR-0002 Q3 deferred)."""

    OWNER = "owner"
    MANAGER = "manager"
    EXECUTOR = "executor"


class Goal(Base):
    """Goal, joined to its Entity row (see docs/adr/0002-reconciliation-first-slice.md).

    `parent_id` is pure structure ("lives under") from ADR-0003 Step 2b — not the semantic
    KPI->KPI alignment graph, which is a separate relation added in Step 3. No resource
    linkage here either (also Step 3).
    """

    __tablename__ = "goal"

    entity_id: Mapped[str] = mapped_column(String(36), ForeignKey("entity.id"), primary_key=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("entity.id"), nullable=True, index=True)

    role_label: Mapped[str] = mapped_column(String(20), default=RoleLabel.OWNER.value)
    is_backlog: Mapped[bool] = mapped_column(Boolean, default=False)
