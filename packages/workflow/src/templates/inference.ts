import type { TemplateExtractionIR, TemplateObservation, TemplatePack } from './contracts.js';
import { TemplatePackSchema } from './contracts.js';
import { createCoverageReport } from './coverage.js';
import { mergeExtractionIR } from './ir.js';

function unique(values: Array<string | undefined>): string[] { return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim())))); }
function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'template'; }
function primaryRole(observation: TemplateObservation): string { return observation.role ?? (observation.type === 'text' ? 'body' : observation.type); }
function slideTypeFor(role: string): TemplatePack['archetypes'][number]['slideType'] { return role === 'title' ? 'title' : role === 'table' || role === 'chart' ? 'chart' : role === 'figure' || role === 'image' ? 'evidence' : 'summary'; }

export function inferTemplatePack(input: TemplateExtractionIR | TemplateExtractionIR[], options: { id?: string; name?: string; version?: string; description?: string } = {}): TemplatePack {
  const ir = Array.isArray(input) ? mergeExtractionIR(options.id ?? 'template-ir', input) : input;
  const id = options.id ?? slug(ir.id);
  const colors = unique(ir.observations.flatMap((observation) => observation.colors));
  const fonts = unique(ir.observations.map((observation) => observation.fontFamily));
  const canvas = ir.sources[0]?.dimensions ?? { width: 1280, height: 720 };
  const roleGroups = new Map<string, TemplateObservation[]>();
  for (const observation of ir.observations) {
    const role = primaryRole(observation);
    roleGroups.set(role, [...(roleGroups.get(role) ?? []), observation]);
  }
  if (roleGroups.size === 0) roleGroups.set('body', []);
  const archetypes = Array.from(roleGroups.entries()).slice(0, 8).map(([role, observations], index) => {
    const exemplar = observations[0];
    const bbox = exemplar?.bbox ?? { x: 64 + index * 24, y: 96 + index * 48, width: 640, height: 120 };
    const provenance = observations.map((observation) => observation.provenance);
    return {
      id: `${id}-${slug(role)}-layout`,
      name: `${role.replace(/-/g, ' ')} layout`,
      slideType: slideTypeFor(role),
      purpose: `Reusable ${role} slot inferred from template extraction observations.`,
      slots: [{ id: `${slug(role)}-slot`, role, bbox, required: role === 'title', accepts: Array.from(new Set(observations.map((o) => o.type))).length ? Array.from(new Set(observations.map((o) => o.type))) : ['text' as const], confidence: observations.length ? Math.max(...observations.map((o) => o.confidence)) : 0.5, provenance }],
      confidence: observations.length ? observations.reduce((sum, observation) => sum + observation.confidence, 0) / observations.length : 0.5,
      provenance,
    };
  });
  const fragments = archetypes.map((archetype) => ({ id: `${archetype.id}-fragment`, archetypeId: archetype.id, description: `Parameterized DSL fragment for ${archetype.name}.`, variables: Object.fromEntries(archetype.slots.map((slot) => [slot.role, 'string | image | table | chart'])), slideDsl: { layout: archetype.id, slots: archetype.slots.map((slot) => slot.role) }, confidence: archetype.confidence, provenance: archetype.provenance }));
  let pack = TemplatePackSchema.parse({
    id,
    version: options.version ?? '1.0.0',
    name: options.name ?? `${id} template`,
    description: options.description ?? 'Draft template pack inferred from reference inputs.',
    createdAt: new Date().toISOString(),
    sources: ir.sources,
    tokens: {
      palette: { primary: colors[0] ?? '#1a2c4e', secondary: '#ffffff', accent: colors[1] ?? '#2c6fad', neutral: colors[2] ?? '#4a4a4a' },
      typography: { headingFont: fonts[0] ?? 'Inter, Arial, sans-serif', bodyFont: fonts[1] ?? fonts[0] ?? 'Inter, Arial, sans-serif', monoFont: 'JetBrains Mono, monospace', scaleRatio: 1.2 },
      spacing: { element: 16, section: 32, margin: { top: 48, right: 64, bottom: 48, left: 64 } },
      canvas,
      backgrounds: colors.slice(0, 2),
    },
    archetypes,
    fragments,
    guidance: { summary: 'Use extracted slots/fragments to generate ordinary Maliang Deck JSON DSL; renderers remain template-unaware.', outline: ['Use the extracted visual hierarchy after story outline approval.'], deckPlan: ['Select a template archetype by slide purpose.'], slideDsl: ['Compile template slots into ordinary DSL elements with concrete coordinates.'] },
    provenance: ir.observations.map((observation) => observation.provenance),
    activation: { status: 'draft' },
    warnings: Array.from(new Set(ir.warnings.concat(ir.observations.flatMap((observation) => observation.warnings)))),
  });
  pack = { ...pack, coverage: createCoverageReport(pack, ir) };
  return TemplatePackSchema.parse(pack);
}
