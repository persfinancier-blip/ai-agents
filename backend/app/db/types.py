"""Shared column types.

JSON is declared with a Postgres-specific variant so a later SQLite -> Postgres
swap (see README) does not require touching model definitions.
"""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

JSONType = JSON().with_variant(JSONB, "postgresql")
