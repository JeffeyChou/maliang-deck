import { projectRoot } from './project.js';
import { resolveProjectMaliangDeckConfig } from './config.js';
import { getStyle } from './guidance/style-registry.js';
import { registerConfiguredTemplatePacksForProject } from './templates/registry.js';
import type { DeckDesign, DesignTokens, PaletteTokens, SpacingTokens, TypographyTokens } from './guidance/types.js';

const DEFAULT_CANVAS = { width: 1280, height: 720 };

const DEFAULT_TOKENS: DesignTokens = {
  palette: {
    primary: '#1f2937',
    secondary: '#ffffff',
    accent: '#2563eb',
    neutral: '#6b7280',
  },
  typography: {
    headingFont: 'Arial, Helvetica, sans-serif',
    bodyFont: 'Arial, Helvetica, sans-serif',
    monoFont: 'Consolas, Courier New, monospace',
    scaleRatio: 1.2,
  },
  spacing: {
    element: 16,
    section: 32,
    margin: { top: 48, right: 64, bottom: 48, left: 64 },
  },
};

function mergePalette(base: PaletteTokens, patch?: Partial<PaletteTokens>): PaletteTokens {
  return {
    ...base,
    ...patch,
    semantic: patch?.semantic ?? base.semantic,
  };
}

function mergeTypography(base: TypographyTokens, patch?: Partial<TypographyTokens>): TypographyTokens {
  return { ...base, ...patch };
}

type SpacingPatch = Partial<Omit<SpacingTokens, 'margin'>> & { margin?: Partial<SpacingTokens['margin']> };

function mergeSpacing(base: SpacingTokens, patch?: SpacingPatch): SpacingTokens {
  return {
    ...base,
    ...patch,
    margin: { ...base.margin, ...patch?.margin },
  };
}

function styleTokens(styleId: string | undefined, includeDrafts: boolean): DesignTokens {
  const style = styleId ? getStyle(styleId, { includeDrafts }) : undefined;
  return style?.tokens ?? DEFAULT_TOKENS;
}

export function resolveProjectStyleContract(slugOrPath: string, existing?: Partial<DeckDesign>): DeckDesign {
  const root = projectRoot(slugOrPath);
  const templateRegistration = registerConfiguredTemplatePacksForProject(root);
  const { config } = resolveProjectMaliangDeckConfig(root);
  const styleId = config.styleId ?? existing?.styleId ?? templateRegistration.styleId ?? 'default';
  const baseTokens = styleTokens(styleId, templateRegistration.includeDraftTemplatePacks);
  const canvas = config.canvas ?? existing?.canvas ?? DEFAULT_CANVAS;
  const palette = mergePalette(baseTokens.palette, existing?.palette);
  const typography = mergeTypography(baseTokens.typography, existing?.typography);
  const spacing = mergeSpacing(baseTokens.spacing, existing?.spacing);
  const configTokens = config.tokens;
  const finalPalette = mergePalette(palette, configTokens?.palette);
  const finalTypography = mergeTypography(typography, configTokens?.typography);
  const finalSpacing = mergeSpacing(spacing, configTokens?.spacing);
  const style = getStyle(styleId, { includeDrafts: templateRegistration.includeDraftTemplatePacks });
  const theme = config.theme ?? existing?.theme ?? style?.recommendedTheme ?? 'minimal-white';

  return {
    styleId,
    theme,
    canvas,
    palette: finalPalette,
    typography: finalTypography,
    spacing: finalSpacing,
    typographyScaleId: existing?.typographyScaleId ?? `${styleId}-typography`,
    paletteId: existing?.paletteId ?? `${styleId}-palette`,
    lockedTokens: {
      titleBandHeight: existing?.lockedTokens?.titleBandHeight ?? Math.round(canvas.height * 0.18),
      margins: finalSpacing.margin,
      spacing: { element: finalSpacing.element, section: finalSpacing.section },
    },
  };
}
