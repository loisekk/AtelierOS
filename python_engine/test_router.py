"""Atelier router smoke tests. Run from python_engine/: python test_router.py"""

import asyncio

from router import (
    ModelTier, classify, cost_tracker, get_router,
    score_complexity, tier_for_score, verify_environment,
)


def test_scoring() -> None:
    easy, _ = score_complexity("list the files in the folder")
    hard, reasons = score_complexity(
        "Refactor the auth architecture and fix the security vulnerability",
        dag_depth=4, dependencies=5, has_code=True,
        multi_file=True, security_sensitive=True,
    )
    assert 0 <= easy <= 100 and 0 <= hard <= 100
    assert easy < 40, f"expected FAST, got {easy}"
    assert hard >= 70, f"expected HEAVY, got {hard}: {reasons}"
    assert tier_for_score(easy) is ModelTier.FAST
    assert tier_for_score(hard) is ModelTier.HEAVY
    print(f"[ok] scoring — easy={easy} (FAST), hard={hard} (HEAVY)")


def test_classify() -> None:
    result = classify("Summarize this changelog")
    assert result["tier"] == "fast", result
    print(f"[ok] classify — {result}")


async def test_live_completion() -> None:
    problems = verify_environment()
    if problems:
        print(f"[skip] live completion ({'; '.join(problems)})")
        return
    result = await get_router("smoke-test").complete(
        messages=[{"role": "user", "content": "Reply with exactly: OK"}],
        step_id="smoke", tier=ModelTier.FAST, max_tokens=16,
    )
    assert result["content"], result
    print(f"[ok] live completion — model={result['model']} cost=${result['cost_usd']:.6f}")
    print(f"[ok] totals — {cost_tracker.totals('smoke-test')}")


if __name__ == "__main__":
    test_scoring()
    test_classify()
    asyncio.run(test_live_completion())
    print("all router smoke tests passed")