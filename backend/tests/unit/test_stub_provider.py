from app.llm.stub_provider import StubProvider
from app.schemas.board import BoardOpinionOutput


async def test_stub_provider_returns_schema_shaped_response() -> None:
    provider = StubProvider()

    raw = await provider.complete_structured(system="irrelevant", user="irrelevant", schema={})
    opinion = BoardOpinionOutput.model_validate(raw)

    assert 0 <= opinion.confidence <= 1
    assert opinion.recommendation
    assert opinion.rationale
