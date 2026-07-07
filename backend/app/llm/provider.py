"""LLM provider abstraction.

`board/personas.py` and `scenarios/generator.py` (M2+) must depend only on
`LLMProvider` here, never import an SDK directly, so the provider is
swappable via the `LLM_PROVIDER` env var without touching call sites.
"""

from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    @abstractmethod
    async def complete_structured(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        """Return a dict matching `schema`, produced via forced tool-use /
        function-calling (never prompt-only JSON parsing)."""
        raise NotImplementedError
