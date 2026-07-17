from datetime import datetime

from pydantic import BaseModel

from app.models.unit_group import UnitGroupKind


class UnitGroupCreate(BaseModel):
    name: str
    kind: UnitGroupKind
    description: str | None = None
    parent_id: str | None = None


class UnitGroupUpdate(BaseModel):
    name: str | None = None
    kind: UnitGroupKind | None = None
    description: str | None = None
    parent_id: str | None = None


class UnitGroupRead(BaseModel):
    entity_id: str
    name: str
    kind: str
    description: str | None
    parent_id: str | None
    created_at: datetime
