"""
Atelier — Phase 12: LiteLLM Dynamic Model Router.

Routes DAG steps to cost-appropriate models, tracks spend live, publishes
CostRecords to subscribers (main.py's WS outbox -> Brain Core HUD), and
optionally streams tokens through an async callback (future hook for live
typing on the 3D monitors).

Singletons:
    cost_tracker         — shared CostTracker (subscribe here)
    get_router(task_id)  — per-task ModelRouter

Usage:
    from router import get_router, ModelTier
    result = await get_router(task_id).complete(messages, step_id="s3")

Streaming:
    async def on_token(text: str) -> None: ...   # receives each delta live
    result = await get_router(tid).complete(messages, step_id="s1",
                                            tier=ModelTier.FAST,
                                            stream=True, on_token=on_token)
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Awaitable, Callable

import litellm

logger = logging.getLogger("atelier.router")

__all__ = [
    "ModelTier", "ModelSpec", "MODEL_REGISTRY",
    "score_complexity", "tier_for_score", "classify",
    "CostRecord", "CostTracker", "cost_tracker",
    "ModelRouter", "RouterError", "get_router", "verify_environment",
]


# ---------------------------------------------------------------------------
# Model tiers & registry
# ---------------------------------------------------------------------------

class ModelTier(str, Enum):
    FAST = "fast"    # cheap + quick: routing, summaries, formatting
    SMART = "smart"  # default: implementation, debugging, review
    HEAVY = "heavy"  # expensive + deep: architecture, security, hard bugs


@dataclass(frozen=True)
class ModelSpec:
    model_id: str
    provider: str
    input_cost_per_mtok: float    # USD / 1M input tokens (price fallback)
    output_cost_per_mtok: float   # USD / 1M output tokens (price fallback)
    max_output_tokens: int
    supports_temperature: bool = True
    uses_max_completion_tokens: bool = False  # o1-family quirk


# List order = preference order; later entries are fallbacks.
MODEL_REGISTRY: dict[ModelTier, list[ModelSpec]] = {
    ModelTier.FAST: [
        ModelSpec("claude-3-5-haiku-20241022", "anthropic", 0.80, 4.00, 8192),
        ModelSpec("gpt-4o-mini", "openai", 0.15, 0.60, 16384),
    ],
    ModelTier.SMART: [
        ModelSpec("claude-sonnet-4-20250514", "anthropic", 3.00, 15.00, 16384),
        ModelSpec("gpt-4o", "openai", 2.50, 10.00, 16384),
    ],
    ModelTier.HEAVY: [
        ModelSpec("claude-opus-4-20250514", "anthropic", 15.00, 75.00, 32768),
        ModelSpec("o1", "openai", 15.00, 60.00, 32768,
                  supports_temperature=False, uses_max_completion_tokens=True),
    ],
}


# ---------------------------------------------------------------------------
# Complexity scoring (pure heuristic — no I/O, deterministic)
# ---------------------------------------------------------------------------

COMPLEXITY_KEYWORDS: dict[str, int] = {
    # strong signals
    "architect": 15, "security": 14, "vulnerability": 14, "refactor": 12,
    "architecture": 12, "migration": 12, "concurrency": 10, "distributed": 10,
    "infrastructure": 10, "deploy": 10, "optimize": 9, "performance": 9,
    "pipeline": 8, "integration": 8, "end-to-end": 8,
    # medium
    "implement": 6, "debug": 6, "review": 5, "analyze": 5, "test": 4,
    # light
    "document": 3, "summarize": 2, "format": 2, "rename": 2, "list": 1,
}

TIER_THRESHOLDS: tuple[tuple[int, ModelTier], ...] = (
    (70, ModelTier.HEAVY),
    (40, ModelTier.SMART),
)


def score_complexity(
    text: str,
    *,
    dag_depth: int = 0,
    dependencies: int = 0,
    has_code: bool = False,
    multi_file: bool = False,
    security_sensitive: bool = False,
) -> tuple[int, list[str]]:
    """Score a step 0-100. Higher = more expensive model tier."""
    reasons: list[str] = []
    score = 0

    length = len(text or "")
    if length > 800:
        score += 20
        reasons.append(f"long brief ({length} chars)")
    elif length > 200:
        score += 12
        reasons.append(f"medium brief ({length} chars)")
    else:
        score += 5

    lowered = (text or "").lower()
    hits = [(kw, w) for kw, w in COMPLEXITY_KEYWORDS.items()
            if re.search(rf"\b{re.escape(kw)}\b", lowered)]
    if hits:
        keyword_total = min(sum(w for _, w in hits), 30)
        score += keyword_total
        reasons.append(f"keywords: {', '.join(k for k, _ in hits)} (+{keyword_total})")

    if dag_depth:
        bonus = min(dag_depth * 4, 20)
        score += bonus
        reasons.append(f"dag depth {dag_depth} (+{bonus})")
    if dependencies:
        bonus = min(dependencies * 3, 15)
        score += bonus
        reasons.append(f"{dependencies} dependencies (+{bonus})")
    if has_code:
        score += 10
        reasons.append("code execution (+10)")
    if multi_file:
        score += 8
        reasons.append("multi-file (+8)")
    if security_sensitive:
        score += 15
        reasons.append("security-sensitive (+15)")

    return max(0, min(score, 100)), reasons


def tier_for_score(score: int) -> ModelTier:
    for threshold, tier in TIER_THRESHOLDS:
        if score >= threshold:
            return tier
    return ModelTier.FAST


def classify(text: str, **flags: Any) -> dict[str, Any]:
    """One-call helper for graph.py's planner node — enriches a DAG step with
    {'complexity': int, 'model_tier': 'fast'|'smart'|'heavy', 'reasons': [...]}"""
    score, reasons = score_complexity(text, **flags)
    return {
        "complexity": score,
        "model_tier": tier_for_score(score).value,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# Cost tracking
# ---------------------------------------------------------------------------

@dataclass
class CostRecord:
    task_id: str
    step_id: str
    model: str
    tier: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: float
    timestamp: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "task_id": self.task_id,
            "step_id": self.step_id,
            "model": self.model,
            "tier": self.tier,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_usd": round(self.cost_usd, 6),
            "latency_ms": round(self.latency_ms, 1),
            "timestamp": self.timestamp,
        }


CostListener = Callable[[CostRecord, dict[str, Any]], None]


class CostTracker:
    """In-memory spend ledger with a listener bus.

    main.py subscribes and emits:
        {"type": "cost_update", "data": {**record.to_dict(), "task_totals": totals}}
    Listeners run inline (inside the event loop) — keep them fast
    (queue.put, never direct socket sends)."""

    def __init__(self) -> None:
        self._records: list[CostRecord] = []
        self._listeners: list[CostListener] = []
        self._lock = threading.Lock()

    def subscribe(self, listener: CostListener) -> Callable[[], None]:
        """Returns an unsubscribe handle."""
        self._listeners.append(listener)

        def unsubscribe() -> None:
            try:
                self._listeners.remove(listener)
            except ValueError:
                pass

        return unsubscribe

    def record(self, rec: CostRecord) -> None:
        with self._lock:
            self._records.append(rec)
        totals = self.totals(rec.task_id)
        for listener in list(self._listeners):
            try:
                listener(rec, totals)
            except Exception:  # a broken HUD listener must never kill a task
                logger.exception("cost listener failed")

    def totals(self, task_id: str) -> dict[str, Any]:
        with self._lock:
            records = [r for r in self._records if r.task_id == task_id]
        return self._aggregate(records, task_id)

    def all_totals(self) -> dict[str, dict[str, Any]]:
        with self._lock:
            by_task: dict[str, list[CostRecord]] = {}
            for rec in self._records:
                by_task.setdefault(rec.task_id, []).append(rec)
        return {tid: self._aggregate(recs, tid) for tid, recs in by_task.items()}

    @staticmethod
    def _aggregate(records: list[CostRecord], task_id: str) -> dict[str, Any]:
        by_tier: dict[str, dict[str, float]] = {}
        by_model: dict[str, dict[str, float]] = {}
        for rec in records:
            tier = by_tier.setdefault(rec.tier, {"calls": 0, "cost_usd": 0.0})
            tier["calls"] += 1
            tier["cost_usd"] += rec.cost_usd
            model = by_model.setdefault(rec.model, {"calls": 0, "cost_usd": 0.0})
            model["calls"] += 1
            model["cost_usd"] += rec.cost_usd
        return {
            "task_id": task_id,
            "calls": len(records),
            "input_tokens": sum(r.input_tokens for r in records),
            "output_tokens": sum(r.output_tokens for r in records),
            "cost_usd": round(sum(r.cost_usd for r in records), 6),
            "latency_ms": round(sum(r.latency_ms for r in records), 1),
            "by_tier": by_tier,
            "by_model": by_model,
        }


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

class RouterError(RuntimeError):
    """All models in a tier (including fallbacks) failed."""


class ModelRouter:
    """Per-task router. Execution nodes call complete() instead of hitting an
    LLM SDK directly; every call is metered, costed, and reported."""

    def __init__(self, task_id: str, tracker: CostTracker) -> None:
        self.task_id = task_id
        self.tracker = tracker

    async def complete(
        self,
        messages: list[dict[str, str]],
        step_id: str = "",
        tier: ModelTier | str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        request_timeout: float = 120.0,
        stream: bool = False,
        on_token: Callable[[str], Awaitable[None]] | None = None,
        **extra: Any,
    ) -> dict[str, Any]:
        """One routed, metered LLM call.

        stream=True consumes the provider's stream (content is still returned
        whole); on_token, if provided, receives each delta live. o1-family
        specs silently complete non-streamed (they reject streaming).
        """
        # Resolve tier — caller's explicit choice (enum or string) wins;
        # otherwise score the message content.
        if tier is None:
            text = " ".join(str(m.get("content", "")) for m in messages)
            score, _ = score_complexity(text)
            tier = tier_for_score(score)
        if isinstance(tier, str):
            tier = ModelTier(tier)

        specs = MODEL_REGISTRY[tier]
        last_error: Exception | None = None

        for index, spec in enumerate(specs):
            wants_stream = stream
            if wants_stream and spec.uses_max_completion_tokens:
                wants_stream = False
                logger.info("%s rejects streaming — completing non-streamed", spec.model_id)

            params = self._build_params(
                spec, temperature, max_tokens, request_timeout, wants_stream, extra
            )
            started = time.perf_counter()
            try:
                response = await litellm.acompletion(
                    model=spec.model_id, messages=messages, **params
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "[%s/%s] %s failed (%s: %s) — %s",
                    self.task_id, step_id, spec.model_id, type(exc).__name__, exc,
                    "trying fallback" if index + 1 < len(specs) else "no fallbacks left",
                )
                continue

            latency_ms = (time.perf_counter() - started) * 1000.0

            if isinstance(response, litellm.ModelResponse):
                # isinstance NARROWS litellm's ModelResponse | CustomStreamWrapper
                # union — .choices is type-safe here. No ignore comments, no
                # red squiggles.
                if response.choices:
                    content = response.choices[0].message.content or ""
                else:
                    content = ""
                usage = getattr(response, "usage", None)
                cost_source: Any = response
            elif hasattr(response, "__aiter__"):
                content, usage, cost_source = await self._extract_streamed(response, on_token)
            else:
                raise RouterError(
                    f"Unexpected response type from {spec.model_id}: {type(response).__name__}"
                )

            input_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
            output_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
            cost_usd = self._compute_cost(cost_source, spec, input_tokens, output_tokens)

            self.tracker.record(CostRecord(
                task_id=self.task_id, step_id=step_id, model=spec.model_id,
                tier=tier.value, input_tokens=input_tokens, output_tokens=output_tokens,
                cost_usd=cost_usd, latency_ms=latency_ms, timestamp=time.time(),
            ))

            return {
                "content": content,
                "model": spec.model_id,
                "tier": tier.value,
                "fallback_used": index > 0,
                "streamed": wants_stream,
                "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
                "cost_usd": round(cost_usd, 6),
                "latency_ms": round(latency_ms, 1),
            }

        raise RouterError(
            f"All {tier.value}-tier models failed for task {self.task_id!r} "
            f"step {step_id!r}: {last_error}"
        )

    # -- internals ----------------------------------------------------------

    @staticmethod
    async def _extract_streamed(
        response: Any,
        on_token: Callable[[str], Awaitable[None]] | None,
    ) -> tuple[str, Any, Any]:
        """Consume a streaming response (CustomStreamWrapper).

        Returns (content, usage, final_chunk). usage is the last non-None
        value seen — providers only attach it to the final chunk when
        stream_options={"include_usage": True} was sent (we always send it),
        otherwise streamed calls would book as 0 tokens / $0.
        """
        parts: list[str] = []
        usage: Any = None        # initialized — no `dir()` hack needed
        final_chunk: Any = None  # initialized — empty streams are safe
        async for chunk in response:
            final_chunk = chunk
            chunk_usage = getattr(chunk, "usage", None)
            if chunk_usage is not None:
                usage = chunk_usage
            choices = getattr(chunk, "choices", None)
            if choices:
                delta = getattr(choices[0], "delta", None)
                text = getattr(delta, "content", None) if delta is not None else None
                if text:
                    parts.append(text)
                    if on_token is not None:
                        await on_token(text)
        return "".join(parts), usage, final_chunk

    @staticmethod
    def _build_params(
        spec: ModelSpec, temperature: float, max_tokens: int,
        request_timeout: float, stream: bool, extra: dict[str, Any],
    ) -> dict[str, Any]:
        params: dict[str, Any] = dict(extra)
        params["timeout"] = request_timeout
        if spec.supports_temperature:
            params["temperature"] = temperature
        if spec.uses_max_completion_tokens:
            # o1 guard: rejects `max_tokens` and `temperature`.
            params["max_completion_tokens"] = min(max_tokens, spec.max_output_tokens)
        else:
            params["max_tokens"] = min(max_tokens, spec.max_output_tokens)
        if stream:
            params["stream"] = True
            # Ask the provider to attach token usage to the final chunk —
            # without this, streamed calls record 0 tokens / $0.
            params["stream_options"] = {"include_usage": True}
        return params

    @staticmethod
    def _compute_cost(response_like: Any, spec: ModelSpec,
                      input_tokens: int, output_tokens: int) -> float:
        try:
            return float(litellm.completion_cost(completion_response=response_like))
        except Exception:
            # litellm doesn't know every model's price — registry fallback.
            return (input_tokens * spec.input_cost_per_mtok
                    + output_tokens * spec.output_cost_per_mtok) / 1_000_000


# ---------------------------------------------------------------------------
# Module singletons
# ---------------------------------------------------------------------------

cost_tracker = CostTracker()
_routers: dict[str, ModelRouter] = {}
_routers_lock = threading.Lock()
MAX_CACHED_ROUTERS = 256


def get_router(task_id: str) -> ModelRouter:
    with _routers_lock:
        router = _routers.get(task_id)
        if router is None:
            if len(_routers) >= MAX_CACHED_ROUTERS:
                _routers.pop(next(iter(_routers)))  # FIFO eviction
            router = ModelRouter(task_id=task_id, tracker=cost_tracker)
            _routers[task_id] = router
        return router


def verify_environment() -> list[str]:
    """Startup check — returns problems (empty list = good)."""
    problems = []
    for var in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY"):
        if not os.getenv(var):
            problems.append(f"missing env var {var}")
    return problems