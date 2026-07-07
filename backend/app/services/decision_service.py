from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision import Decision, DecisionLifecycleStage
from app.models.entity import Entity
from app.schemas.decision import Alternative, DecisionCreate, DecisionPatch, DecisionRead, SuccessKpi


class DecisionAlreadyDecidedError(Exception):
    """Raised when trying to patch the canvas of a decision that's already been decided."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def to_decision_read(entity: Entity, decision: Decision) -> DecisionRead:
    return DecisionRead(
        id=entity.id,
        entity_type=entity.entity_type,
        name=entity.name,
        description=entity.description,
        owner=entity.owner,
        status=entity.status,
        lifecycle_stage=entity.lifecycle_stage,
        risk_level=entity.risk_level,
        problem=decision.problem,
        goal=decision.goal,
        initiator=decision.initiator,
        stakeholders=decision.stakeholders,
        alternatives=[Alternative(**a) for a in decision.alternatives],
        constraints=decision.constraints,
        assumptions=decision.assumptions,
        success_kpis=[SuccessKpi(**k) for k in decision.success_kpis],
        estimated_cost=decision.estimated_cost,
        estimated_timeline_days=decision.estimated_timeline_days,
        decision_type=decision.decision_type,
        autonomy_level=decision.autonomy_level,
        final_decision=decision.final_decision,
        decided_by=decision.decided_by,
        decided_at=decision.decided_at,
        actual_result=decision.actual_result,
        lessons_learned=decision.lessons_learned,
        evaluated_at=decision.evaluated_at,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


async def create_decision(session: AsyncSession, payload: DecisionCreate) -> tuple[Entity, Decision]:
    entity = Entity(
        entity_type="decision",
        name=payload.name,
        description=payload.description,
        owner=payload.owner,
        status="draft",
        lifecycle_stage=DecisionLifecycleStage.DISCOVERED.value,
    )
    session.add(entity)
    await session.flush()  # populate entity.id

    decision = Decision(
        entity_id=entity.id,
        problem=payload.problem,
        goal=payload.goal,
        initiator=payload.initiator,
        stakeholders=payload.stakeholders,
        alternatives=[a.model_dump() for a in payload.alternatives],
        constraints=payload.constraints,
        assumptions=payload.assumptions,
        success_kpis=[k.model_dump() for k in payload.success_kpis],
        estimated_cost=payload.estimated_cost,
        estimated_timeline_days=payload.estimated_timeline_days,
        decision_type=payload.decision_type.value,
        autonomy_level=payload.autonomy_level.value,
    )
    session.add(decision)
    await session.commit()
    await session.refresh(entity)
    await session.refresh(decision)
    return entity, decision


async def _get_row(session: AsyncSession, decision_id: str) -> tuple[Entity, Decision] | None:
    result = await session.execute(
        select(Entity, Decision).join(Decision, Decision.entity_id == Entity.id).where(Entity.id == decision_id)
    )
    return result.tuples().one_or_none()


async def get_decision(session: AsyncSession, decision_id: str) -> tuple[Entity, Decision] | None:
    return await _get_row(session, decision_id)


async def list_decisions(session: AsyncSession) -> list[tuple[Entity, Decision]]:
    result = await session.execute(select(Entity, Decision).join(Decision, Decision.entity_id == Entity.id))
    return list(result.tuples().all())


async def patch_decision(
    session: AsyncSession, decision_id: str, payload: DecisionPatch
) -> tuple[Entity, Decision] | None:
    row = await _get_row(session, decision_id)
    if row is None:
        return None
    entity, decision = row

    if decision.final_decision is not None:
        raise DecisionAlreadyDecidedError(f"Decision {decision_id} already has a final decision recorded")

    updates = payload.model_dump(exclude_unset=True)
    entity_fields = {"name", "description"}
    for field, value in updates.items():
        if field in entity_fields:
            setattr(entity, field, value)
        elif field in ("alternatives", "success_kpis") and value is not None:
            setattr(decision, field, [item.model_dump() if hasattr(item, "model_dump") else item for item in value])
        else:
            setattr(decision, field, value)

    entity.version += 1
    entity.updated_at = _now()

    await session.commit()
    await session.refresh(entity)
    await session.refresh(decision)
    return entity, decision
