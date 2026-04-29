#!/usr/bin/env python3
"""Maliang Deck export bridge — calls svg_to_pptx's public API directly.

Avoids pptx_cli.py's project-directory conventions and relative imports.
Accepts a JSON argument with svg_files, output, format, and notes.
"""
import sys
import json
from pathlib import Path

# Add the svg_to_pptx package to path
sys.path.insert(0, str(Path(__file__).parent))
from svg_to_pptx import create_pptx_with_native_svg
from svg_to_pptx.pptx_animation_bridge import write_capability_report

def main():
    if len(sys.argv) < 2:
        print("Usage: maliang_deck_export.py '<json_args>'", file=sys.stderr)
        sys.exit(1)

    args = json.loads(sys.argv[1])
    svg_files = [Path(f) for f in args['svg_files']]
    notes = args.get('notes', {})
    output = Path(args['output'])
    animation_plan = args.get('animation_plan')
    animation_report = args.get('animation_report')
    if animation_plan and animation_report:
        write_capability_report(animation_plan, animation_report)

    output.parent.mkdir(parents=True, exist_ok=True)

    success = create_pptx_with_native_svg(
        svg_files=svg_files,
        output_path=output,
        canvas_format=args.get('format'),
        use_native_shapes=True,
        notes=notes,
        enable_notes=bool(notes),
        animation_plan=animation_plan,
    )

    if success:
        print(f"Exported {len(svg_files)} slides to {output}")
    else:
        print("Export failed", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
