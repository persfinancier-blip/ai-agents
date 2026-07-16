"""add unit entity and goal unit_id

Revision ID: 0f9898942202
Revises: 338ffd927507
Create Date: 2026-07-16 17:56:20.288106

Data migration (ADR-0006 §6, one-time): for each distinct non-empty entity.owner among
goals, creates one Unit(kind=employee, name=<owner text>) with its entity row, and sets
unit_id on the affected goals. Goal.owner is not dropped by this revision (owner stays a
base Entity Platform field used by other subtypes); only the Goal API stops reading/writing
it (see app/schemas/goal.py, app/services/goal_service.py).

Downgrade drops the unit table and goal.unit_id column; unit assignments created by the
data migration (and any made afterwards through the API) are lost — acceptable for this
one-time transition, not reversible.
"""

import uuid
from collections.abc import Sequence
from datetime import datetime, timezone

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0f9898942202"
down_revision: str | None = "338ffd927507"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "unit",
        sa.Column("entity_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entity.id"]),
        sa.PrimaryKeyConstraint("entity_id"),
    )

    # SQLite can't ALTER a table to add a FK constraint outside of batch mode
    # (copy-and-move strategy), unlike the other dialects autogenerate assumes.
    with op.batch_alter_table("goal", schema=None) as batch_op:
        batch_op.add_column(sa.Column("unit_id", sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f("ix_goal_unit_id"), ["unit_id"], unique=False)
        batch_op.create_foreign_key("fk_goal_unit_id_unit", "unit", ["unit_id"], ["entity_id"])

    _migrate_owner_text_to_units()


def _migrate_owner_text_to_units() -> None:
    connection = op.get_bind()
    entity_table = sa.table(
        "entity",
        sa.column("id", sa.String),
        sa.column("entity_type", sa.String),
        sa.column("name", sa.String),
        sa.column("owner", sa.String),
        sa.column("status", sa.String),
        sa.column("lifecycle_stage", sa.String),
        sa.column("version", sa.Integer),
        sa.column("risk_level", sa.String),
        sa.column("tags", sa.JSON),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    unit_table = sa.table("unit", sa.column("entity_id", sa.String), sa.column("kind", sa.String))
    goal_table = sa.table("goal", sa.column("entity_id", sa.String), sa.column("unit_id", sa.String))

    owners = connection.execute(
        sa.select(entity_table.c.id, entity_table.c.owner).where(
            entity_table.c.entity_type == "goal", entity_table.c.owner != ""
        )
    ).all()

    unit_id_by_owner_text: dict[str, str] = {}
    now = datetime.now(timezone.utc)
    for goal_entity_id, owner_text in owners:
        if owner_text not in unit_id_by_owner_text:
            unit_entity_id = str(uuid.uuid4())
            connection.execute(
                entity_table.insert().values(
                    id=unit_entity_id,
                    entity_type="unit",
                    name=owner_text,
                    owner="",
                    status="active",
                    lifecycle_stage="active",
                    version=1,
                    risk_level="low",
                    tags=[],
                    created_at=now,
                    updated_at=now,
                )
            )
            connection.execute(unit_table.insert().values(entity_id=unit_entity_id, kind="employee"))
            unit_id_by_owner_text[owner_text] = unit_entity_id

        connection.execute(
            goal_table.update()
            .where(goal_table.c.entity_id == goal_entity_id)
            .values(unit_id=unit_id_by_owner_text[owner_text])
        )


def downgrade() -> None:
    with op.batch_alter_table("goal", schema=None) as batch_op:
        batch_op.drop_constraint("fk_goal_unit_id_unit", type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_goal_unit_id"))
        batch_op.drop_column("unit_id")
    op.drop_table("unit")
