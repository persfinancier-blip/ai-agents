from datetime import datetime

from pydantic import BaseModel

from app.models.unit import UnitKind


class UnitCreate(BaseModel):
    name: str
    kind: UnitKind
    description: str | None = None


class UnitUpdate(BaseModel):
    name: str | None = None
    kind: UnitKind | None = None
    description: str | None = None


class UnitRead(BaseModel):
    entity_id: str
    name: str
    kind: str
    description: str | None
    created_at: datetime
