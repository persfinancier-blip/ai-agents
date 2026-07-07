"""Persona prompts + calls. v0 ships CFO only (docs/full-vision/04_Simulation/Decision_Center.md section 10
lists 7 personas total; CMO/HR/Legal/CEO/COO/CTO land in later milestones).

Depends only on the abstract LLMProvider — never import an SDK here.
"""

from app.llm.provider import LLMProvider
from app.models.decision import Decision
from app.schemas.board import BoardOpinionOutput

CFO_SYSTEM_PROMPT = (
    "You are the CFO on an AI Board of Directors advising on a business decision. "
    "Evaluate the decision strictly from a financial, cost, ROI, and risk perspective. "
    "Be concise, concrete, and honest about trade-offs."
)


def _build_user_prompt(decision: Decision) -> str:
    lines = [
        f"Problem: {decision.problem}",
        f"Goal: {decision.goal}",
        f"Decision type: {decision.decision_type}",
    ]
    if decision.constraints:
        lines.append(f"Constraints: {'; '.join(decision.constraints)}")
    if decision.assumptions:
        lines.append(f"Assumptions: {'; '.join(decision.assumptions)}")
    if decision.alternatives:
        alt_lines = [f"- {a['name']}: {a['description']}" for a in decision.alternatives]
        lines.append("Alternatives:\n" + "\n".join(alt_lines))
    if decision.estimated_cost is not None:
        lines.append(f"Estimated cost: {decision.estimated_cost}")
    if decision.estimated_timeline_days is not None:
        lines.append(f"Estimated timeline (days): {decision.estimated_timeline_days}")
    return "\n".join(lines)


async def get_cfo_opinion(provider: LLMProvider, decision: Decision) -> BoardOpinionOutput:
    schema = BoardOpinionOutput.model_json_schema()
    raw = await provider.complete_structured(
        system=CFO_SYSTEM_PROMPT,
        user=_build_user_prompt(decision),
        schema=schema,
    )
    return BoardOpinionOutput.model_validate(raw)
