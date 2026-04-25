"""Maliang Deck PPTX animation-plan data model.

This module intentionally owns only the bridge contract for animation lowering.
TypeScript generates the canonical plan from the DSL; Python consumes the plan
when PPTX internals can safely map entries into DrawingML/PresentationML XML.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class PptxAnimationItem:
    elementId: str
    effect: str
    durationMs: int
    delayMs: int
    sourceOrder: int
    easing: str | None = None


@dataclass(frozen=True)
class PptxAnimationStep:
    step: int
    items: list[PptxAnimationItem] = field(default_factory=list)


@dataclass(frozen=True)
class PptxAnimationPlan:
    slideId: str
    steps: list[PptxAnimationStep] = field(default_factory=list)


def parse_animation_plan(value: Any) -> list[PptxAnimationPlan]:
    """Parse the JSON-compatible plan emitted by @maliang-deck/exporter."""
    plans: list[PptxAnimationPlan] = []
    for slide in value or []:
        steps: list[PptxAnimationStep] = []
        for step in slide.get('steps', []):
            items = [
                PptxAnimationItem(
                    elementId=str(item['elementId']),
                    effect=str(item['effect']),
                    durationMs=int(item.get('durationMs', 500)),
                    delayMs=int(item.get('delayMs', 0)),
                    easing=item.get('easing'),
                    sourceOrder=int(item.get('sourceOrder', 0)),
                )
                for item in step.get('items', [])
            ]
            steps.append(PptxAnimationStep(step=int(step['step']), items=items))
        plans.append(PptxAnimationPlan(slideId=str(slide['slideId']), steps=steps))
    return plans
