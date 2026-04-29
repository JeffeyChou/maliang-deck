"""Core SVG -> DrawingML dispatcher, group handling, and main entry point."""

from __future__ import annotations

import re
import base64
import json
from pathlib import Path
from xml.etree import ElementTree as ET

from .drawingml_context import ConvertContext, ShapeResult
from .drawingml_utils import (
    SVG_NS,
    _extract_inheritable_styles, resolve_url_id, px_to_emu, _xml_escape,
)
from .drawingml_styles import build_effect_xml
from .drawingml_elements import (
    convert_rect, convert_circle, convert_ellipse,
    convert_line, convert_path,
    convert_polygon, convert_polyline,
    convert_text, convert_text_group, convert_image,
)


def _extract_shape_ids(xml: str) -> list[int]:
    return [int(match) for match in re.findall(r'<p:cNvPr id="(\d+)"', xml)]


def _payload(elem: ET.Element, attr: str) -> dict | None:
    raw = elem.get(attr)
    if not raw:
        return None
    try:
        return json.loads(base64.b64decode(raw).decode('utf-8'))
    except Exception as exc:
        print(f'  Warning: Failed to decode {attr}: {exc}')
        return None


def _box(payload: dict) -> tuple[int, int, int, int]:
    box = payload.get('box') or payload.get('style') or {}
    return (
        px_to_emu(float(box.get('x', 0))),
        px_to_emu(float(box.get('y', 0))),
        px_to_emu(float(box.get('width', 100))),
        px_to_emu(float(box.get('height', 50) or 50)),
    )


def _cell_text(cell) -> str:
    if cell is None:
        return ''
    if isinstance(cell, dict):
        return str(cell.get('text', ''))
    return str(cell)


def _color(value: str | None, fallback: str = '000000') -> str:
    if not value:
        return fallback
    value = value.strip()
    if value.startswith('#'):
        value = value[1:]
    if len(value) == 3:
        value = ''.join(ch * 2 for ch in value)
    return value.upper() if re.fullmatch(r'[0-9A-Fa-f]{6}', value) else fallback


def convert_metadata_table(elem: ET.Element, ctx: ConvertContext) -> ShapeResult | None:
    payload = _payload(elem, 'data-maliang-table')
    if not payload:
        return None
    rows = payload.get('rows') or []
    if not rows:
        return None
    off_x, off_y, ext_cx, ext_cy = _box(payload)
    col_count = max(1, max(len(row) for row in rows))
    row_count = max(1, len(rows))
    col_w = max(ext_cx // col_count, 1)
    row_h = max(ext_cy // row_count, 1)
    style = payload.get('style') or {}
    border = _color(style.get('borderColor'), 'CBD5E1')
    header_bg = _color(style.get('headerBackground'), 'F1F5F9')
    header_color = _color(style.get('headerColor'), '0F172A')
    body_color = '0F172A'
    font_size = int(float(style.get('fontSize') or 14) * 100)
    font_family = _xml_escape(str(style.get('fontFamily') or 'Arial'))

    tr_xml: list[str] = []
    for row_index, row in enumerate(rows):
        tc_xml: list[str] = []
        for col_index in range(col_count):
            text = _xml_escape(_cell_text(row[col_index] if col_index < len(row) else ''))
            is_header = row_index == 0
            fill = header_bg if is_header else 'FFFFFF'
            text_color = header_color if is_header else body_color
            bold = ' b="1"' if is_header else ''
            tc_xml.append(f'''<a:tc>
<a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="{font_size}"{bold}><a:solidFill><a:srgbClr val="{text_color}"/></a:solidFill><a:latin typeface="{font_family}"/></a:rPr><a:t>{text}</a:t></a:r></a:p></a:txBody>
<a:tcPr><a:solidFill><a:srgbClr val="{fill}"/></a:solidFill><a:lnL><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:lnL><a:lnR><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:lnR><a:lnT><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:lnT><a:lnB><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:lnB></a:tcPr>
</a:tc>''')
        tr_xml.append(f'<a:tr h="{row_h}">{"".join(tc_xml)}</a:tr>')

    shape_id = ctx.next_id()
    grid = ''.join(f'<a:gridCol w="{col_w}"/>' for _ in range(col_count))
    xml = f'''<p:graphicFrame>
<p:nvGraphicFramePr><p:cNvPr id="{shape_id}" name="{_xml_escape(payload.get('id') or f'Table {shape_id}')}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
<p:xfrm><a:off x="{off_x}" y="{off_y}"/><a:ext cx="{ext_cx}" cy="{ext_cy}"/></p:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1"/><a:tblGrid>{grid}</a:tblGrid>{''.join(tr_xml)}</a:tbl></a:graphicData></a:graphic>
</p:graphicFrame>'''
    return ShapeResult(xml=xml, bounds_emu=(off_x, off_y, off_x + ext_cx, off_y + ext_cy), element_id=payload.get('id'), shape_ids=[shape_id])


def _chart_part_xml(payload: dict) -> str:
    chart_type = payload.get('chartType', 'bar')
    series = payload.get('data') or []
    grouping = '<c:grouping val="clustered"/>' if chart_type == 'bar' else ''
    tag = {'bar': 'barChart', 'line': 'lineChart', 'pie': 'pieChart', 'doughnut': 'doughnutChart'}.get(chart_type, 'barChart')
    ser_xml: list[str] = []
    for idx, item in enumerate(series):
        labels = item.get('labels') or []
        values = item.get('values') or []
        cat_pts = ''.join(f'<c:pt idx="{i}"><c:v>{_xml_escape(str(label))}</c:v></c:pt>' for i, label in enumerate(labels))
        val_pts = ''.join(f'<c:pt idx="{i}"><c:v>{float(value)}</c:v></c:pt>' for i, value in enumerate(values))
        ser_xml.append(f'''<c:ser><c:idx val="{idx}"/><c:order val="{idx}"/><c:tx><c:v>{_xml_escape(str(item.get('name') or f'Series {idx + 1}'))}</c:v></c:tx><c:cat><c:strLit><c:ptCount val="{len(labels)}"/>{cat_pts}</c:strLit></c:cat><c:val><c:numLit><c:ptCount val="{len(values)}"/>{val_pts}</c:numLit></c:val></c:ser>''')
    axes = '' if chart_type in ('pie', 'doughnut') else '<c:axId val="123456"/><c:axId val="654321"/>'
    axis_xml = '' if chart_type in ('pie', 'doughnut') else '<c:catAx><c:axId val="123456"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="654321"/></c:catAx><c:valAx><c:axId val="654321"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="123456"/></c:valAx>'
    hole = '<c:holeSize val="50"/>' if chart_type == 'doughnut' else ''
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:chart><c:plotArea><c:layout/><c:{tag}>{grouping}{''.join(ser_xml)}{axes}{hole}</c:{tag}>{axis_xml}</c:plotArea><c:legend><c:legendPos val="r"/></c:legend><c:plotVisOnly val="1"/></c:chart>
</c:chartSpace>'''


def convert_metadata_chart(elem: ET.Element, ctx: ConvertContext) -> ShapeResult | None:
    payload = _payload(elem, 'data-maliang-chart')
    if not payload:
        return None
    off_x, off_y, ext_cx, ext_cy = _box(payload)
    chart_idx = len(ctx.chart_files) + 1
    chart_name = f'chart{ctx.slide_num}_{chart_idx}.xml'
    ctx.chart_files[chart_name] = _chart_part_xml(payload)
    r_id = ctx.next_rel_id()
    ctx.rel_entries.append({
        'id': r_id,
        'type': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
        'target': f'../charts/{chart_name}',
    })
    shape_id = ctx.next_id()
    xml = f'''<p:graphicFrame>
<p:nvGraphicFramePr><p:cNvPr id="{shape_id}" name="{_xml_escape(payload.get('id') or f'Chart {shape_id}')}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
<p:xfrm><a:off x="{off_x}" y="{off_y}"/><a:ext cx="{ext_cx}" cy="{ext_cy}"/></p:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="{r_id}"/></a:graphicData></a:graphic>
</p:graphicFrame>'''
    return ShapeResult(xml=xml, bounds_emu=(off_x, off_y, off_x + ext_cx, off_y + ext_cy), element_id=payload.get('id'), shape_ids=[shape_id])


def convert_metadata_formula(elem: ET.Element, ctx: ConvertContext) -> ShapeResult | None:
    payload = _payload(elem, 'data-maliang-formula')
    if not payload:
        return None
    style = payload.get('style') or {}
    off_x = px_to_emu(float(style.get('x', 0)))
    off_y = px_to_emu(float(style.get('y', 0)))
    ext_cx = px_to_emu(float(style.get('width', 120)))
    ext_cy = px_to_emu(float(style.get('height') or float(style.get('fontSize', 28)) * 1.5))
    font_size = int(float(style.get('fontSize') or 28) * 100)
    color = _color(style.get('color'), '000000')
    latex = _xml_escape(str(payload.get('latex') or ''))
    shape_id = ctx.next_id()
    xml = f'''<p:sp>
<p:nvSpPr><p:cNvPr id="{shape_id}" name="{_xml_escape(payload.get('id') or f'Formula {shape_id}')}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="{off_x}" y="{off_y}"/><a:ext cx="{ext_cx}" cy="{ext_cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="{font_size}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:rPr><a:t>{latex}</a:t></a:r><m:oMath><m:r><m:t>{latex}</m:t></m:r></m:oMath></a:p></p:txBody>
</p:sp>'''
    return ShapeResult(xml=xml, bounds_emu=(off_x, off_y, off_x + ext_cx, off_y + ext_cy), element_id=payload.get('id'), shape_ids=[shape_id])


# ---------------------------------------------------------------------------
# Transform & layout helpers
# ---------------------------------------------------------------------------

def parse_transform(transform_str: str) -> tuple[float, float, float, float, float]:
    """Parse SVG transform string, extract translate, scale, and rotate.

    Returns:
        (dx, dy, sx, sy, angle_deg) tuple.
    """
    if not transform_str:
        return 0.0, 0.0, 1.0, 1.0, 0.0

    dx, dy = 0.0, 0.0
    sx, sy = 1.0, 1.0
    angle_deg = 0.0

    m = re.search(r'translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)', transform_str)
    if m:
        dx = float(m.group(1))
        dy = float(m.group(2))

    m = re.search(r'scale\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)', transform_str)
    if m:
        sx = float(m.group(1))
        sy = float(m.group(2)) if m.group(2) else sx

    m = re.search(r'rotate\(\s*([-\d.]+)', transform_str)
    if m:
        angle_deg = float(m.group(1))

    return dx, dy, sx, sy, angle_deg


# ---------------------------------------------------------------------------
# Group handling
# ---------------------------------------------------------------------------

def convert_g(elem: ET.Element, ctx: ConvertContext) -> ShapeResult | None:
    """Convert SVG <g> to DrawingML group shape <p:grpSp>.

    Preserves group structure so elements can be selected and moved together
    in PowerPoint. Single-child groups are flattened to avoid unnecessary nesting.

    Uses identity coordinate mapping (chOff/chExt == off/ext) so child shapes
    keep their absolute slide coordinates unchanged.

    Maliang Deck text-group interception: if the <g> has data-maliang-deck-id, it is a
    text-group wrapper (multi-line text). Delegate to convert_text_group()
    instead of recursing into children.
    """
    maliang_deck_id = elem.get('data-maliang-deck-id')
    kind = elem.get('data-maliang-deck-kind')
    if kind == 'table':
        return convert_metadata_table(elem, ctx)
    if kind == 'chart':
        return convert_metadata_chart(elem, ctx)
    if maliang_deck_id is not None and (elem.get('data-box-x') is not None or elem.get('data-text-role') is not None):
        return convert_text_group(elem, ctx)

    transform = elem.get('transform', '')
    dx, dy, sx, sy, angle_deg = parse_transform(transform)

    filter_id = resolve_url_id(elem.get('filter', ''))
    style_overrides = _extract_inheritable_styles(elem)
    child_ctx = ctx.child(dx, dy, sx, sy, filter_id, style_overrides)

    child_results: list[ShapeResult] = []
    for child in elem:
        result = convert_element(child, child_ctx)
        if result:
            child_results.append(result)

    ctx.sync_from_child(child_ctx)

    if not child_results:
        return None

    # Single child: flatten
    if len(child_results) == 1:
        return child_results[0]

    # Multiple children: wrap in <p:grpSp>
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')

    for child_result in child_results:
        bounds = child_result.bounds_emu
        if bounds is None:
            continue
        min_x = min(min_x, bounds[0])
        min_y = min(min_y, bounds[1])
        max_x = max(max_x, bounds[2])
        max_y = max(max_y, bounds[3])

    if min_x == float('inf'):
        return ShapeResult(xml='\n'.join(result.xml for result in child_results))

    group_x = int(min_x)
    group_y = int(min_y)
    group_w = max(int(max_x - min_x), 1)
    group_h = max(int(max_y - min_y), 1)

    shapes_xml = '\n'.join(result.xml for result in child_results)
    group_id = ctx.next_id()

    group_effect = ''
    if filter_id and filter_id in ctx.defs:
        group_effect = build_effect_xml(ctx.defs[filter_id])

    rot_emu = int(angle_deg * 60000)
    rot_attr = f' rot="{rot_emu}"' if rot_emu else ''

    child_shape_ids = [shape_id for result in child_results for shape_id in result.shape_ids]

    return ShapeResult(xml=f'''<p:grpSp>
<p:nvGrpSpPr>
<p:cNvPr id="{group_id}" name="{_xml_escape(maliang_deck_id or f'Group {group_id}')}"/>
<p:cNvGrpSpPr/>
<p:nvPr/>
</p:nvGrpSpPr>
<p:grpSpPr>
<a:xfrm{rot_attr}>
<a:off x="{group_x}" y="{group_y}"/>
<a:ext cx="{group_w}" cy="{group_h}"/>
<a:chOff x="{group_x}" y="{group_y}"/>
<a:chExt cx="{group_w}" cy="{group_h}"/>
</a:xfrm>
{group_effect}
</p:grpSpPr>
{shapes_xml}
</p:grpSp>''', bounds_emu=(group_x, group_y, group_x + group_w, group_y + group_h), element_id=maliang_deck_id, shape_ids=[group_id, *child_shape_ids])


# ---------------------------------------------------------------------------
# Defs collection & element dispatch
# ---------------------------------------------------------------------------

_NON_VISUAL_TAGS = frozenset(('defs', 'title', 'desc', 'metadata', 'style'))

_CONVERTERS = {
    'rect': convert_rect,
    'circle': convert_circle,
    'ellipse': convert_ellipse,
    'line': convert_line,
    'path': convert_path,
    'polygon': convert_polygon,
    'polyline': convert_polyline,
    'text': convert_text,
    'image': convert_image,
    'g': convert_g,
}


def collect_defs(root: ET.Element) -> dict[str, ET.Element]:
    """Collect all <defs> children into an {id: element} dictionary."""
    defs: dict[str, ET.Element] = {}
    for defs_elem in root.iter(f'{{{SVG_NS}}}defs'):
        for child in defs_elem:
            elem_id = child.get('id')
            if elem_id:
                defs[elem_id] = child
    # Also check for defs without namespace
    for defs_elem in root.iter('defs'):
        for child in defs_elem:
            elem_id = child.get('id')
            if elem_id:
                defs[elem_id] = child
    return defs


def convert_element(elem: ET.Element, ctx: ConvertContext) -> ShapeResult | None:
    """Dispatch an SVG element to the appropriate converter."""
    tag = elem.tag.replace(f'{{{SVG_NS}}}', '')

    converter = _CONVERTERS.get(tag)
    if converter:
        try:
            result = converter(elem, ctx)
            if result:
                element_id = elem.get('data-maliang-deck-id')
                if element_id and result.element_id is None:
                    result.element_id = element_id
                if not result.shape_ids:
                    result.shape_ids = _extract_shape_ids(result.xml)
            return result
        except Exception as e:
            print(f'  Warning: Failed to convert <{tag}>: {e}')
            return None

    if tag in _NON_VISUAL_TAGS:
        return None

    return None


def convert_svg_to_slide_shapes(
    svg_path: Path,
    slide_num: int = 1,
    verbose: bool = False,
) -> tuple[str, dict[str, bytes], dict[str, str], list[dict[str, str]], dict[str, list[int]]]:
    """Convert an SVG file to a complete DrawingML slide XML.

    Args:
        svg_path: Path to the SVG file.
        slide_num: Slide number (for naming).
        verbose: Print progress info.

    Returns:
        (slide_xml, media_files, chart_files, rel_entries, shape_id_map) where:
        - slide_xml: Complete slide XML string.
        - media_files: Dict of {filename: bytes} for media to write.
        - rel_entries: List of relationship entries to add.
    """
    tree = ET.parse(str(svg_path))
    root = tree.getroot()

    defs = collect_defs(root)
    ctx = ConvertContext(defs=defs, slide_num=slide_num, svg_dir=Path(svg_path).parent)

    shapes: list[str] = []
    shape_id_map: dict[str, list[int]] = {}
    converted = 0
    skipped = 0

    for child in root:
        tag = child.tag.replace(f'{{{SVG_NS}}}', '')
        if tag == 'defs':
            continue
        result = convert_element(child, ctx)
        if result:
            shapes.append(result.xml)
            if result.element_id and result.shape_ids:
                shape_id_map.setdefault(result.element_id, []).extend(result.shape_ids)
            converted += 1
        else:
            if tag not in _NON_VISUAL_TAGS:
                skipped += 1

    if verbose:
        print(f'  Converted {converted} elements, skipped {skipped}')

    shapes_xml = '\n'.join(shapes)

    slide_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:spTree>
<p:nvGrpSpPr>
<p:cNvPr id="1" name=""/>
<p:cNvGrpSpPr/><p:nvPr/>
</p:nvGrpSpPr>
<p:grpSpPr>
<a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>
<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
</p:grpSpPr>
{shapes_xml}
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>'''

    return slide_xml, ctx.media_files, ctx.chart_files, ctx.rel_entries, shape_id_map
