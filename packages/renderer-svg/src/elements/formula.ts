import katex from 'katex';
import type { LayoutWarning } from '@maliang-deck/text-measure';
import type { FormulaElement, FormulaStep } from '../../../schema/src/types.js';
import { animationDataAttrs, buildOpacityAttrs, buildTransform, escapeXml, jsonDataAttr, n } from '../utils.js';
import type { RenderResult } from './index.js';

function extractMathml(html: string): string | undefined {
  const match = html.match(/<math[\s\S]*?<\/math>/u);
  return match?.[0];
}

function renderLatex(latex: string, displayMode: boolean): { mathml?: string; error?: string } {
  try {
    const html = katex.renderToString(latex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
      strict: 'ignore',
    });
    return { mathml: extractMathml(html) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function formulaFrames(el: FormulaElement): Array<{ latex: string; step: number; source: 'base' | 'step'; stepMeta?: FormulaStep }> {
  if (!el.steps?.length) return [{ latex: el.latex, step: el.animation?.step ?? 0, source: 'base' }];
  return [
    { latex: el.latex, step: el.animation?.step ?? 0, source: 'base' },
    ...el.steps.map((step, index) => ({
      latex: step.latex,
      step: (el.animation?.step ?? 0) + index + 1,
      source: 'step' as const,
      stepMeta: step,
    })),
  ];
}

type FormulaLayout = { svg: string; width: number; minY: number; maxY: number };

const COMMAND_REPLACEMENTS: Record<string, string> = {
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\Gamma': 'Γ',
  '\\delta': 'δ',
  '\\Delta': 'Δ',
  '\\epsilon': 'ε',
  '\\theta': 'θ',
  '\\lambda': 'λ',
  '\\kappa': 'κ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\pi': 'π',
  '\\sigma': 'σ',
  '\\Sigma': 'Σ',
  '\\psi': 'ψ',
  '\\Psi': 'Ψ',
  '\\omega': 'ω',
  '\\Omega': 'Ω',
  '\\hbar': 'ℏ',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\int': '∫',
  '\\cdot': '·',
  '\\times': '×',
  '\\pm': '±',
  '\\approx': '≈',
  '\\geq': '≥',
  '\\leq': '≤',
  '\\neq': '≠',
  '\\left': '',
  '\\right': '',
  '\\,': ' ',
  '\\;': ' ',
  '\\quad': ' ',
};

const SUPER: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  n: 'ⁿ', i: 'ⁱ',
};

const SUB: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

function toScript(text: string, table: Record<string, string>, marker: string): string {
  return [...text].map((char) => table[char] ?? (marker === '^' ? char : `${marker}${char}`)).join('');
}

function readBraceGroup(input: string, start: number): { value: string; end: number } | undefined {
  let cursor = start;
  while (/\s/u.test(input[cursor] ?? '')) cursor += 1;
  if (input[cursor] !== '{') return undefined;
  let depth = 0;
  for (let i = cursor; i < input.length; i += 1) {
    const char = input[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return { value: input.slice(cursor + 1, i), end: i + 1 };
  }
  return undefined;
}

function replaceCommandGroup(input: string, command: string, replacer: (value: string) => string): string {
  let output = '';
  let cursor = 0;
  while (cursor < input.length) {
    const index = input.indexOf(command, cursor);
    if (index < 0) {
      output += input.slice(cursor);
      break;
    }
    const group = readBraceGroup(input, index + command.length);
    if (!group) {
      output += input.slice(cursor, index + command.length);
      cursor = index + command.length;
      continue;
    }
    output += input.slice(cursor, index) + replacer(group.value);
    cursor = group.end;
  }
  return output;
}

function normalizeLatexText(latex: string): string {
  let text = latex;
  text = replaceCommandGroup(text, '\\sqrt', (value) => `√(${normalizeLatexText(value)})`);
  text = replaceCommandGroup(text, '\\mathbf', (value) => normalizeLatexText(value));
  text = replaceCommandGroup(text, '\\mathrm', (value) => normalizeLatexText(value));
  text = replaceCommandGroup(text, '\\hat', (value) => `${normalizeLatexText(value)}̂`);
  text = text.replace(/\^\{([^{}]+)\}/gu, (_, value: string) => toScript(normalizeLatexText(value), SUPER, '^'));
  text = text.replace(/_\{([^{}]+)\}/gu, (_, value: string) => toScript(normalizeLatexText(value), SUB, '_'));
  text = text.replace(/\^([A-Za-z0-9+\-=()])/gu, (_, value: string) => toScript(value, SUPER, '^'));
  text = text.replace(/_([A-Za-z0-9+\-=()])/gu, (_, value: string) => toScript(value, SUB, '_'));
  for (const [command, replacement] of Object.entries(COMMAND_REPLACEMENTS)) {
    text = text.split(command).join(replacement);
  }
  text = text.replace(/\\([A-Za-z]+)/gu, '$1');
  text = text.replace(/[{}]/gu, '');
  text = text.replace(/\s+/gu, ' ');
  return text;
}

function findFrac(input: string): { prefix: string; numerator: string; denominator: string; suffix: string } | undefined {
  let cursor = 0;
  while (cursor < input.length) {
    const index = input.indexOf('\\frac', cursor);
    if (index < 0) return undefined;
    const numerator = readBraceGroup(input, index + 5);
    const denominator = numerator ? readBraceGroup(input, numerator.end) : undefined;
    if (numerator && denominator) {
      return {
        prefix: input.slice(0, index),
        numerator: numerator.value,
        denominator: denominator.value,
        suffix: input.slice(denominator.end),
      };
    }
    cursor = index + 5;
  }
  return undefined;
}

function findCommandGroup(input: string, command: string): { prefix: string; value: string; suffix: string } | undefined {
  let cursor = 0;
  while (cursor < input.length) {
    const index = input.indexOf(command, cursor);
    if (index < 0) return undefined;
    const group = readBraceGroup(input, index + command.length);
    if (group) {
      return {
        prefix: input.slice(0, index),
        value: group.value,
        suffix: input.slice(group.end),
      };
    }
    cursor = index + command.length;
  }
  return undefined;
}

function estimateFormulaTextWidth(text: string, fontSize: number): number {
  const narrow = (text.match(/[ .,;:|()[\]{}]/gu)?.length ?? 0) * fontSize * 0.18;
  return Math.max(fontSize * 0.25, text.length * fontSize * 0.53 - narrow);
}

function layoutText(latex: string, fontSize: number, color: string): FormulaLayout {
  const text = normalizeLatexText(latex);
  if (!text) return { svg: '', width: 0, minY: -fontSize * 0.85, maxY: fontSize * 0.25 };
  const width = estimateFormulaTextWidth(text, fontSize);
  const svg = `<text x="0" y="0" font-size="${n(fontSize)}" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" font-style="italic" fill="${escapeXml(color)}" data-formula-text="true">${escapeXml(text)}</text>`;
  return { svg, width, minY: -fontSize * 0.85, maxY: fontSize * 0.25 };
}

function translateLayout(layout: FormulaLayout, x: number, y = 0): string {
  if (!layout.svg) return '';
  return `<g transform="translate(${n(x)} ${n(y)})">${layout.svg}</g>`;
}

function layoutFormula(latex: string, fontSize: number, color: string, depth = 0): FormulaLayout {
  const sqrt = depth < 6 ? findCommandGroup(latex, '\\sqrt') : undefined;
  if (sqrt) {
    const prefix = layoutFormula(sqrt.prefix, fontSize, color, depth + 1);
    const radicand = layoutFormula(sqrt.value, fontSize * 0.82, color, depth + 1);
    const suffix = layoutFormula(sqrt.suffix, fontSize, color, depth + 1);
    const rootWidth = fontSize * 0.5;
    const pad = fontSize * 0.12;
    const rootX = prefix.width + fontSize * 0.1;
    const radicandX = rootX + rootWidth + pad;
    const suffixX = radicandX + radicand.width + fontSize * 0.15;
    const topY = Math.min(-fontSize * 0.8, radicand.minY - fontSize * 0.12);
    const svg = [
      translateLayout(prefix, 0),
      `<text x="${n(rootX)}" y="${n(fontSize * 0.08)}" font-size="${n(fontSize)}" font-family="Cambria Math, STIX Two Math, Times New Roman, serif" fill="${escapeXml(color)}">√</text>`,
      `<line x1="${n(radicandX - pad * 0.4)}" y1="${n(topY)}" x2="${n(radicandX + radicand.width + pad * 0.6)}" y2="${n(topY)}" stroke="${escapeXml(color)}" stroke-width="${n(Math.max(1, fontSize * 0.045))}" data-formula-root-bar="true"/>`,
      translateLayout(radicand, radicandX, 0),
      translateLayout(suffix, suffixX),
    ].filter(Boolean).join('\n');
    return {
      svg,
      width: suffixX + suffix.width,
      minY: Math.min(prefix.minY, topY - fontSize * 0.05, radicand.minY, suffix.minY),
      maxY: Math.max(prefix.maxY, radicand.maxY, suffix.maxY),
    };
  }

  const frac = depth < 6 ? findFrac(latex) : undefined;
  if (!frac) return layoutText(latex, fontSize, color);

  const prefix = layoutFormula(frac.prefix, fontSize, color, depth + 1);
  const numerator = layoutFormula(frac.numerator, fontSize * 0.78, color, depth + 1);
  const denominator = layoutFormula(frac.denominator, fontSize * 0.78, color, depth + 1);
  const suffix = layoutFormula(frac.suffix, fontSize, color, depth + 1);
  const pad = fontSize * 0.18;
  const fractionWidth = Math.max(numerator.width, denominator.width, fontSize * 0.65) + pad * 2;
  const barY = -fontSize * 0.08;
  const numeratorY = -fontSize * 0.52;
  const denominatorY = fontSize * 0.82;
  const fractionX = prefix.width + fontSize * 0.12;
  const suffixX = fractionX + fractionWidth + fontSize * 0.12;
  const numeratorX = fractionX + (fractionWidth - numerator.width) / 2;
  const denominatorX = fractionX + (fractionWidth - denominator.width) / 2;
  const fractionSvg = [
    translateLayout(numerator, numeratorX, numeratorY),
    `<line x1="${n(fractionX)}" y1="${n(barY)}" x2="${n(fractionX + fractionWidth)}" y2="${n(barY)}" stroke="${escapeXml(color)}" stroke-width="${n(Math.max(1, fontSize * 0.055))}" data-formula-fraction-bar="true"/>`,
    translateLayout(denominator, denominatorX, denominatorY),
  ].filter(Boolean).join('\n');
  const svg = [
    translateLayout(prefix, 0),
    fractionSvg,
    translateLayout(suffix, suffixX),
  ].filter(Boolean).join('\n');
  return {
    svg,
    width: suffixX + suffix.width,
    minY: Math.min(prefix.minY, numeratorY + numerator.minY, suffix.minY),
    maxY: Math.max(prefix.maxY, denominatorY + denominator.maxY, suffix.maxY),
  };
}

function formulaLayer(latex: string, x: number, y: number, fontSize: number, color: string): string {
  const layout = layoutFormula(latex, fontSize, color);
  const baselineY = y + Math.max(fontSize, -layout.minY);
  return `<g transform="translate(${n(x)} ${n(baselineY)})" data-formula-layer="visual">\n${layout.svg}\n</g>`;
}

export function renderFormula(el: FormulaElement, mode: 'pdf-final' | 'pptx-steps' = 'pdf-final'): RenderResult {
  const fontSize = el.fontSize ?? 28;
  const color = el.color ?? '#f1f5f9';
  const frames = mode === 'pptx-steps' ? formulaFrames(el) : [formulaFrames(el).at(-1) ?? { latex: el.latex, step: 0, source: 'base' as const }];
  const transform = buildTransform(el);
  const opacityAttrs = buildOpacityAttrs(el.opacity);
  const parts: string[] = [];
  const warnings: LayoutWarning[] = [];

  frames.forEach((frame, index) => {
    const rendered = renderLatex(frame.latex, el.displayMode ?? true);
    if (rendered.error) {
      warnings.push({
        type: 'unsupported-feature' as const,
        message: `Formula "${el.id}" could not be rendered by KaTeX: ${rendered.error}`,
        elementId: el.id,
        phase: 'render-svg' as const,
        policy: 'native' as const,
      });
    }
    const metadata = {
      kind: 'formula',
      id: el.id,
      latex: frame.latex,
      mathml: rendered.mathml,
      displayMode: el.displayMode ?? true,
      style: { fontSize, color, opacity: el.opacity, rotation: el.rotation, x: el.x, y: el.y, width: el.width, height: el.height },
      animation: el.animation,
      step: frame.step,
      frame: index,
      source: frame.source,
      stepMeta: frame.stepMeta,
    };
    const attrs = [
      ...animationDataAttrs(el),
      `data-maliang-deck-kind="formula"`,
      `data-maliang-frame="${index}"`,
      `data-maliang-formula-step="${frame.step}"`,
      jsonDataAttr('data-maliang-formula', metadata),
      opacityAttrs,
      transform ? `transform="${transform}"` : '',
    ].filter(Boolean).join(' ');
    parts.push(`<g ${attrs}>\n${formulaLayer(frame.latex, el.x, el.y, fontSize, color)}\n</g>`);
  });

  return { svg: parts.join('\n'), warnings };
}
