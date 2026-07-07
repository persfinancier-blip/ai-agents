"""No-op provider so the app runs end-to-end with zero API keys and zero cost.

This is the default LLM_PROVIDER. It's a demo/dev convenience, not a test
double — tests always use tests.fakes.FakeLLMProvider via dependency
override, never this class. Switch to LLM_PROVIDER=anthropic (+ a real
ANTHROPIC_API_KEY) to get actual model-generated opinions.
"""

from typing import Any

from app.llm.provider import LLMProvider

_STUB_NOTICE = (
    "[Заглушка — LLM_PROVIDER не настроен. Укажите LLM_PROVIDER=anthropic и "
    "ANTHROPIC_API_KEY в .env, чтобы получить реальное мнение AI Board.]"
)


class StubProvider(LLMProvider):
    async def complete_structured(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "recommendation": f"{_STUB_NOTICE} Действовать осторожно до реального анализа.",
            "confidence": 0.5,
            "key_risks": ["Это тестовые данные, а не реальная оценка рисков."],
            "key_benefits": ["Это тестовые данные, а не реальная оценка выгод."],
            "rationale": _STUB_NOTICE,
        }
