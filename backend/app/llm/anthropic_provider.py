"""Anthropic implementation of LLMProvider. Wired up in M2 when the first
persona call is added — no live calls happen in M1."""

from typing import Any

import anthropic

from app.config import settings
from app.llm.provider import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, model: str = "claude-sonnet-4-5") -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key or settings.anthropic_api_key)
        self._model = model

    async def complete_structured(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user}],
            tools=[{"name": "respond", "description": "Return the structured response.", "input_schema": schema}],
            tool_choice={"type": "tool", "name": "respond"},
        )
        for block in response.content:
            if block.type == "tool_use":
                return dict(block.input)
        raise RuntimeError("Anthropic response contained no tool_use block")
