from typing import Any

from app.llm.provider import LLMProvider


class FakeLLMProvider(LLMProvider):
    """Test double: returns a canned response regardless of prompt.

    CI never calls a live LLM API (see CONTRIBUTING.md) — this is the only
    provider tests are allowed to exercise.
    """

    def __init__(self, response: dict[str, Any]) -> None:
        self._response = response
        self.calls: list[dict[str, Any]] = []

    async def complete_structured(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        self.calls.append({"system": system, "user": user, "schema": schema})
        return self._response


DEFAULT_CFO_RESPONSE = {
    "recommendation": "Proceed with the market expansion.",
    "confidence": 0.7,
    "key_risks": ["Currency exposure", "Regulatory delays"],
    "key_benefits": ["Diversified revenue", "First-mover advantage"],
    "rationale": "The financial upside outweighs the identified risks given the estimated cost and timeline.",
}
