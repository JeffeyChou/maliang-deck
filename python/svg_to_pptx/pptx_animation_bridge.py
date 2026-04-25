"""Conservative PPTX animation bridge contract for Maliang Deck.

The current exporter remains static-PPTX-safe. This bridge produces a capability
report from the TypeScript-generated animation plan so unsupported animation
lowering is explicit instead of silently dropped. Future work can call
``animation_xml_for_slide`` from slide XML generation once shape-level IDs are
available in the native PPTX conversion layer.
"""

from __future__ import annotations

from dataclasses import asdict
import json
from pathlib import Path
from typing import Any

from svg_to_pptx.pptx_animation_model import parse_animation_plan

MAPPINGS: dict[str, dict[str, str]] = {
    'fade-up': {'status': 'downgraded', 'pptxTarget': 'fade+motion-up', 'fallback': 'fade'},
    'fade-down': {'status': 'downgraded', 'pptxTarget': 'fade+motion-down', 'fallback': 'fade'},
    'fade-left': {'status': 'downgraded', 'pptxTarget': 'fade+motion-left', 'fallback': 'fade'},
    'fade-right': {'status': 'downgraded', 'pptxTarget': 'fade+motion-right', 'fallback': 'fade'},
    'scale-in': {'status': 'downgraded', 'pptxTarget': 'zoom/scale-entrance', 'fallback': 'fade'},
    'blur-in': {'status': 'downgraded', 'pptxTarget': 'fade', 'fallback': 'fade'},
    'slide-from-left': {'status': 'supported', 'pptxTarget': 'fly-in-left', 'fallback': 'fade'},
    'slide-from-right': {'status': 'supported', 'pptxTarget': 'fly-in-right', 'fallback': 'fade'},
    'rise-in': {'status': 'downgraded', 'pptxTarget': 'fade+motion-up', 'fallback': 'fade'},
    'zoom-pop': {'status': 'downgraded', 'pptxTarget': 'zoom/scale-entrance', 'fallback': 'fade'},
    'rotate-in': {'status': 'downgraded', 'pptxTarget': 'spin/rotate-entrance', 'fallback': 'fade'},
}


def capability_report(plan_value: Any) -> dict[str, Any]:
    plans = parse_animation_plan(plan_value)
    report: dict[str, Any] = {'supported': [], 'downgraded': [], 'unsupported': [], 'warnings': []}
    for slide in plans:
        for step in slide.steps:
            for item in step.items:
                mapping = MAPPINGS.get(item.effect)
                if mapping is None:
                    entry = {
                        'slideId': slide.slideId,
                        'step': step.step,
                        'elementId': item.elementId,
                        'effect': item.effect,
                        'status': 'unsupported',
                        'fallback': 'fade',
                    }
                    report['unsupported'].append(entry)
                    report['warnings'].append({'code': 'pptx-animation-unsupported', 'detail': entry})
                    continue
                entry = {
                    'slideId': slide.slideId,
                    'step': step.step,
                    'elementId': item.elementId,
                    'effect': item.effect,
                    'status': mapping['status'],
                    'pptxTarget': mapping['pptxTarget'],
                    'fallback': mapping['fallback'],
                    'timing': asdict(item),
                }
                report[mapping['status']].append(entry)
    return report


def write_capability_report(plan_path: str | Path, report_path: str | Path) -> dict[str, Any]:
    plan_value = json.loads(Path(plan_path).read_text(encoding='utf-8'))
    report = capability_report(plan_value)
    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    Path(report_path).write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


def animation_xml_for_slide(_slide_id: str, _plan_value: Any) -> str:
    """Return animation XML for a slide.

    Shape-level mapping is intentionally not emitted yet because the existing
    static exporter does not preserve stable DSL element IDs into PPTX shape IDs.
    The capability report is the enforced bridge contract for this milestone.
    """
    return ''
