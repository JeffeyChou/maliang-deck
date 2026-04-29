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


def _fallback_effect(effect: str) -> str:
    mapping = MAPPINGS.get(effect)
    if mapping is None:
        return 'fade'
    target = mapping.get('pptxTarget', '')
    if 'fly' in target:
        return 'fly'
    if 'zoom' in target or 'scale' in target:
        return 'zoom'
    return mapping.get('fallback', 'fade')


def _anim_effect_xml(effect: str, shape_id: int, duration_ms: int, delay_ms: int, ctn_id: int) -> str:
    fallback = _fallback_effect(effect)
    if fallback == 'appear':
        return f'''<p:set><p:cBhvr><p:cTn id="{ctn_id}" dur="1" fill="hold"><p:stCondLst><p:cond delay="{delay_ms}"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{shape_id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'''
    filter_attr = 'fade'
    pr_attr = ''
    if fallback == 'fly':
        filter_attr = 'fly'
        pr_attr = ' prLst="from(b)"'
    elif fallback == 'zoom':
        filter_attr = 'zoom'
        pr_attr = ' prLst="in"'
    return f'''<p:set><p:cBhvr><p:cTn id="{ctn_id}" dur="1" fill="hold"><p:stCondLst><p:cond delay="{delay_ms}"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{shape_id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>
<p:animEffect transition="in" filter="{filter_attr}"{pr_attr}><p:cBhvr><p:cTn id="{ctn_id + 1}" dur="{duration_ms}"/><p:tgtEl><p:spTgt spid="{shape_id}"/></p:tgtEl></p:cBhvr></p:animEffect>'''


def animation_xml_for_slide(slide_id: str, plan_value: Any, shape_id_map: dict[str, list[int]] | None = None) -> str:
    """Return animation XML for a slide.

    Targets are resolved from SVG data-maliang-deck-id metadata preserved by the
    DrawingML converter. Unknown element IDs are skipped so static export stays
    valid while the capability report records unsupported effects.
    """
    plans = parse_animation_plan(plan_value)
    slide = next((item for item in plans if item.slideId == slide_id), None)
    if slide is None or not shape_id_map:
        return ''

    fragments: list[str] = []
    ctn_id = 10
    for step in slide.steps:
        step_items: list[str] = []
        for item in step.items:
            for shape_id in shape_id_map.get(item.elementId, []):
                step_items.append(_anim_effect_xml(item.effect, shape_id, item.durationMs, item.delayMs, ctn_id))
                ctn_id += 3
        if step_items:
            fragments.append(f'''<p:par><p:cTn id="{ctn_id}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{''.join(step_items)}</p:childTnLst></p:cTn></p:par>''')
            ctn_id += 1

    if not fragments:
        return ''

    return f'''<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{''.join(fragments)}</p:childTnLst></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>'''
