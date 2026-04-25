#!/usr/bin/env python3
"""Maliang Deck PDF export — converts SVG slides into a multi-page PDF.

Uses cairosvg for SVG→PDF conversion and pypdf for merging pages.
Falls back to svglib+reportlab if cairosvg is unavailable.
"""
import sys
import json
import tempfile
from pathlib import Path

def export_with_cairosvg(svg_files: list[Path], output_path: Path, width: int, height: int) -> bool:
    """Convert SVGs to PDF pages and merge into one PDF using cairosvg + pypdf."""
    try:
        import cairosvg
    except ImportError:
        return False

    try:
        from pypdf import PdfWriter, PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfWriter, PdfReader
        except ImportError:
            # No PDF merger available, output single pages
            if len(svg_files) == 1:
                cairosvg.svg2pdf(
                    url=str(svg_files[0]),
                    write_to=str(output_path),
                    output_width=width,
                    output_height=height,
                )
                return True
            # Multiple slides but no merger — use simple concatenation
            return export_with_cairosvg_concat(svg_files, output_path, width, height)

    # Convert each SVG to individual PDF, then merge
    writer = PdfWriter()
    tmp_dir = Path(tempfile.mkdtemp(prefix='maliang-deck-pdf-'))

    try:
        for i, svg_path in enumerate(svg_files):
            page_pdf = tmp_dir / f'page_{i:03d}.pdf'
            cairosvg.svg2pdf(
                url=str(svg_path),
                write_to=str(page_pdf),
                output_width=width,
                output_height=height,
            )
            reader = PdfReader(str(page_pdf))
            for page in reader.pages:
                writer.add_page(page)

        with open(output_path, 'wb') as f:
            writer.write(f)
        return True
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


def export_with_cairosvg_concat(svg_files: list[Path], output_path: Path, width: int, height: int) -> bool:
    """Fallback: produce individual PDF files when no merger is available."""
    import cairosvg

    if len(svg_files) == 1:
        cairosvg.svg2pdf(
            url=str(svg_files[0]),
            write_to=str(output_path),
            output_width=width,
            output_height=height,
        )
        return True

    # Multiple files without merger: output first page and warn
    cairosvg.svg2pdf(
        url=str(svg_files[0]),
        write_to=str(output_path),
        output_width=width,
        output_height=height,
    )
    print(f"  Warning: pypdf/PyPDF2 not installed. Only first slide exported to PDF.")
    print(f"  Install with: pip install pypdf")
    return True


def export_with_svglib(svg_files: list[Path], output_path: Path, width: int, height: int) -> bool:
    """Fallback: use svglib + reportlab for SVG→PDF conversion."""
    try:
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPDF
        from reportlab.lib.pagesizes import landscape
        from reportlab.pdfgen import canvas as pdf_canvas
        from reportlab.lib.units import inch
    except ImportError:
        return False

    try:
        from pypdf import PdfWriter, PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfWriter, PdfReader
        except ImportError:
            PdfWriter = None

    tmp_dir = Path(tempfile.mkdtemp(prefix='maliang-deck-pdf-svglib-'))

    try:
        if PdfWriter is not None:
            writer = PdfWriter()
            for i, svg_path in enumerate(svg_files):
                drawing = svg2rlg(str(svg_path))
                if drawing is None:
                    print(f"  Warning: Could not parse {svg_path.name}, skipping")
                    continue
                page_pdf = tmp_dir / f'page_{i:03d}.pdf'
                renderPDF.drawToFile(drawing, str(page_pdf))
                reader = PdfReader(str(page_pdf))
                for page in reader.pages:
                    writer.add_page(page)
            with open(output_path, 'wb') as f:
                writer.write(f)
        else:
            # Single page only
            drawing = svg2rlg(str(svg_files[0]))
            if drawing:
                renderPDF.drawToFile(drawing, str(output_path))
            if len(svg_files) > 1:
                print(f"  Warning: pypdf not installed. Only first slide exported.")
        return True
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: maliang_deck_export_pdf.py '<json_args>'", file=sys.stderr)
        sys.exit(1)

    args = json.loads(sys.argv[1])
    svg_files = [Path(f) for f in args['svg_files']]
    output = Path(args['output'])
    width = args.get('width', 1280)
    height = args.get('height', 720)

    output.parent.mkdir(parents=True, exist_ok=True)

    print(f"  Slide dimensions: {width} x {height} px")
    print(f"  SVG file count: {len(svg_files)}")
    print(f"  Mode: PDF export")
    print()

    # Try cairosvg first (best quality), fall back to svglib
    if export_with_cairosvg(svg_files, output, width, height):
        print(f"[Done] Saved: {output}")
        print(f"  Pages: {len(svg_files)}, Renderer: cairosvg")
        return

    if export_with_svglib(svg_files, output, width, height):
        print(f"[Done] Saved: {output}")
        print(f"  Pages: {len(svg_files)}, Renderer: svglib+reportlab")
        return

    print("Error: No PDF renderer available.", file=sys.stderr)
    print("  Install one of:", file=sys.stderr)
    print("    pip install cairosvg pypdf", file=sys.stderr)
    print("    pip install svglib reportlab pypdf", file=sys.stderr)
    sys.exit(1)


if __name__ == '__main__':
    main()
