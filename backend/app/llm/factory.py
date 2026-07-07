from app.config import settings
from app.llm.provider import LLMProvider


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "stub":
        from app.llm.stub_provider import StubProvider

        return StubProvider()
    if settings.llm_provider == "anthropic":
        from app.llm.anthropic_provider import AnthropicProvider

        return AnthropicProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider!r}")
