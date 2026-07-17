"""unit grouping: departments and teams (ADR-0007)

Revision ID: 064d0e836915
Revises: 0f9898942202
Create Date: 2026-07-17 21:21:29.558636

Repoints goal.unit_id's FK from unit.entity_id to entity.id (ADR-0007 §3: a goal's owner
can now be an atomic unit or a group, both Entity subtypes). SQLite can't drop/add a FK
constraint outside of batch mode (copy-and-move strategy), same precedent as revision
0f9898942202. Existing goal.unit_id values already point at unit.entity_id, which are
entity.id values too, so data stays valid across the repoint with no data migration needed.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "064d0e836915"
down_revision: str | None = "0f9898942202"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "unit_group",
        sa.Column("entity_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("parent_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["entity_id"], ["entity.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["unit_group.entity_id"]),
        sa.PrimaryKeyConstraint("entity_id"),
    )
    op.create_index(op.f("ix_unit_group_parent_id"), "unit_group", ["parent_id"], unique=False)

    op.create_table(
        "team_membership",
        sa.Column("team_id", sa.String(length=36), nullable=False),
        sa.Column("unit_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["unit_group.entity_id"]),
        sa.ForeignKeyConstraint(["unit_id"], ["unit.entity_id"]),
        sa.PrimaryKeyConstraint("team_id", "unit_id"),
    )

    with op.batch_alter_table("unit", schema=None) as batch_op:
        batch_op.add_column(sa.Column("department_id", sa.String(length=36), nullable=True))
        batch_op.create_index(batch_op.f("ix_unit_department_id"), ["department_id"], unique=False)
        batch_op.create_foreign_key("fk_unit_department_id_unit_group", "unit_group", ["department_id"], ["entity_id"])

    with op.batch_alter_table("goal", schema=None) as batch_op:
        batch_op.drop_constraint("fk_goal_unit_id_unit", type_="foreignkey")
        batch_op.create_foreign_key("fk_goal_unit_id_entity", "entity", ["unit_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("goal", schema=None) as batch_op:
        batch_op.drop_constraint("fk_goal_unit_id_entity", type_="foreignkey")
        batch_op.create_foreign_key("fk_goal_unit_id_unit", "unit", ["unit_id"], ["entity_id"])

    with op.batch_alter_table("unit", schema=None) as batch_op:
        batch_op.drop_constraint("fk_unit_department_id_unit_group", type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_unit_department_id"))
        batch_op.drop_column("department_id")

    op.drop_table("team_membership")
    op.drop_index(op.f("ix_unit_group_parent_id"), table_name="unit_group")
    op.drop_table("unit_group")
