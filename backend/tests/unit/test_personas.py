from app.board.personas import get_cfo_opinion
from app.models.decision import Decision
from tests.fakes import DEFAULT_CFO_RESPONSE, FakeLLMProvider


def _decision(**overrides: object) -> Decision:
    defaults: dict[str, object] = {
        "entity_id": "test-entity",
        "problem": "Revenue growth has stalled.",
        "goal": "Find a new market within 2 quarters.",
        "initiator": "alice@example.com",
        "decision_type": "strategic",
        "constraints": [],
        "assumptions": [],
        "alternatives": [],
        "stakeholders": [],
        "success_kpis": [],
    }
    defaults.update(overrides)
    return Decision(**defaults)  # type: ignore[arg-type]


async def test_get_cfo_opinion_builds_prompt_and_parses_response() -> None:
    provider = FakeLLMProvider(dict(DEFAULT_CFO_RESPONSE))
    decision = _decision(estimated_cost=250000.0, estimated_timeline_days=120)

    opinion = await get_cfo_opinion(provider, decision)

    assert opinion.recommendation == DEFAULT_CFO_RESPONSE["recommendation"]
    assert opinion.confidence == DEFAULT_CFO_RESPONSE["confidence"]

    assert len(provider.calls) == 1
    call = provider.calls[0]
    assert "CFO" in call["system"]
    assert "Revenue growth has stalled" in call["user"]
    assert "Estimated cost: 250000.0" in call["user"]
    assert "recommendation" in call["schema"]["properties"]
