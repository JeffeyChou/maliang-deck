import type { StyleDefinition } from '../types.js';

export const academicStyle: StyleDefinition = {
  id: 'academic',
  version: '1.0.0',
  name: 'Academic',
  description: 'Research paper-to-talk style: dense content, precise citations, data-heavy figures, formal tone.',
  recommendedTheme: 'minimal-white',

  tokens: {
    palette: {
      primary: '#1a2c4e',
      secondary: '#ffffff',
      accent: '#2c6fad',
      neutral: '#4a4a4a',
      semantic: {
        success: '#2e7d32',
        warning: '#f57c00',
        danger: '#c62828',
        info: '#0277bd',
      },
      chartPalette: ['#2c6fad', '#c62828', '#2e7d32', '#f57c00', '#0277bd', '#4a4a4a'],
    },
    typography: {
      headingFont: 'Georgia, serif',
      bodyFont: 'Times New Roman, serif',
      monoFont: 'Courier New, monospace',
      scaleRatio: 1.25,
    },
    spacing: {
      element: 12,
      section: 24,
      margin: { top: 48, right: 64, bottom: 48, left: 64 },
    },
    elevation: {
      card: '0 1px 3px rgba(0,0,0,0.15)',
      overlay: '0 4px 12px rgba(0,0,0,0.2)',
    },
    chartDefaults: {
      showLegend: true,
      legendPosition: 'bottom' as const,
      gridLines: true,
      rounded: false,
    },
    tableDefaults: {
      rowStripe: false,
      rounded: false,
      headerContrast: 'subtle' as const,
    },
  },

  layoutPatterns: [
    {
      id: 'academic-title',
      name: 'Academic Title Slide',
      purpose: 'Opening slide with paper title, authors, venue, and affiliation.',
      slideTypes: ['title'],
      elementPositions: {
        title:       { x: 64,  y: 160, w: 1152, h: 120 },
        subtitle:    { x: 64,  y: 300, w: 1152, h:  60 },
        authors:     { x: 64,  y: 400, w: 1152, h:  60 },
        affiliation: { x: 64,  y: 470, w: 1152, h:  40 },
        venue:       { x: 64,  y: 540, w: 1152, h:  40 },
      },
      density: 'medium',
    },
    {
      id: 'academic-section',
      name: 'Academic Section Header',
      purpose: 'Section divider slide with section number and title.',
      slideTypes: ['section'],
      elementPositions: {
        sectionNumber: { x: 64,  y: 260, w: 200, h:  60 },
        title:         { x: 64,  y: 330, w: 1152, h:  80 },
      },
      density: 'low',
    },
    {
      id: 'academic-evidence-chart',
      name: 'Evidence: Chart + Text',
      purpose: 'Evidence slide pairing a data chart with explanatory text and citation.',
      slideTypes: ['evidence', 'chart'],
      elementPositions: {
        title:    { x: 64,  y: 48,  w: 1152, h:  52 },
        chart:    { x: 64,  y: 120, w:  620, h: 440 },
        body:     { x: 720, y: 120, w:  496, h: 380 },
        citation: { x: 720, y: 520, w:  496, h:  40 },
      },
      density: 'high',
    },
    {
      id: 'academic-evidence-figure',
      name: 'Evidence: Figure + Caption',
      purpose: 'Evidence slide pairing a figure image with caption and source label.',
      slideTypes: ['evidence'],
      elementPositions: {
        title:   { x: 64,  y: 48,  w: 1152, h:  52 },
        figure:  { x: 64,  y: 120, w:  800, h: 440 },
        caption: { x: 64,  y: 570, w:  800, h:  60 },
        body:    { x: 900, y: 120, w:  316, h: 440 },
      },
      density: 'high',
    },
    {
      id: 'academic-bibliography',
      name: 'Bibliography',
      purpose: 'References slide listing cited works in academic format.',
      slideTypes: ['closing'],
      elementPositions: {
        title: { x: 64, y: 48,  w: 1152, h:  52 },
        body:  { x: 64, y: 120, w: 1152, h: 520 },
      },
      density: 'high',
    },
    {
      id: 'academic-summary',
      name: 'Summary / Conclusions',
      purpose: 'Conclusions slide with key findings and takeaways.',
      slideTypes: ['summary', 'closing'],
      elementPositions: {
        title: { x: 64, y: 48,  w: 1152, h:  52 },
        body:  { x: 64, y: 120, w: 1152, h: 480 },
        note:  { x: 64, y: 620, w: 1152, h:  40 },
      },
      density: 'medium',
    },
  ],

  stageGuidance: {
    outline: {
      audienceAnalysis: [
        'What is the audience\'s field expertise level (expert / informed / general)?',
        'Are attendees primarily from the same sub-field or interdisciplinary?',
        'What prior knowledge can be assumed, and what must be explained from scratch?',
        'Is the venue a conference talk, thesis defense, seminar, or invited lecture?',
        'Will the audience see the slides during the talk or only as a handout?',
      ],
      storyArc: [
        'Follow IMRaD structure: Introduction → Methods → Results → Discussion / Conclusions.',
        'Open with the research question or hypothesis, not background.',
        'State the key contribution early (within the first 3 slides).',
        'Build toward results incrementally — each slide earns the next.',
        'Close with a clear answer to the opening question and future directions.',
      ],
      infoHierarchy: [
        'Slides carry the visual argument; speaker notes carry derivations and caveats.',
        'Each slide must make exactly one claim, supported by one figure or table.',
        'Move lengthy proofs, full method details, and sensitivity analyses to appendix slides.',
        'Place citation text in speaker notes unless the slide is a bibliography slide.',
        'Limit bullet points — prefer figures, equations, and tables for evidence slides.',
      ],
    },
    deckPlan: {
      layoutRecommendations: {
        title:     'academic-title',
        section:   'academic-section',
        evidence:  'academic-evidence-chart',
        chart:     'academic-evidence-chart',
        figure:    'academic-evidence-figure',
        summary:   'academic-summary',
        closing:   'academic-bibliography',
      },
      vizDefaults: {
        comparison:  'bar',
        trend:       'line',
        distribution: 'bar',
        proportion:  'pie',
        correlation: 'line',
      },
      chartTableGuidance: [
        'Charts default to academic muted palette with legend at bottom.',
        'Tables should use subtle header differentiation.',
        'Prefer style.showDataLabels: true for evidence slides.',
      ],
    },
    slideDsl: {
      elementRules: [
        'Use text elements with textRole="heading" for slide titles.',
        'Use text elements with textRole="body" for explanatory text.',
        'Use text elements with textRole="label" for figure labels, axis labels, and captions.',
        'Chart elements must include axis labels in data series names.',
        'Image elements must include a caption text element below.',
        'Do not use group elements for simple stacking — use explicit x/y positioning.',
      ],
      colorRules: [
        'Primary color #1a2c4e for headings and title text.',
        'Neutral #4a4a4a for body text.',
        'Accent #2c6fad for emphasis, hyperlinks, and callout boxes.',
        'Use semantic colors only for data visualization (success/warning/danger/info).',
        'Background must be white (#ffffff) or near-white — avoid dark backgrounds.',
        'Maintain WCAG AA contrast (≥4.5:1) for all text elements.',
        'Chart style.palette should use hex colors from the academic palette. Omit style.palette to inherit theme colors automatically.',
        'Table style.headerBackground should contrast with style.headerColor at WCAG AA (4.5:1) minimum.',
      ],
      animationRules: [
        'Use subtle, professional animations: prefer fade-up, fade-down, blur-in, or rise-in for element entrances.',
        'Title and heading elements should use step 0 (auto-play on slide enter) with fade-up or blur-in.',
        'Evidence elements (charts, tables, figures) should use step 1+ for click-to-reveal progressive disclosure.',
        'Keep animation durations between 400–600ms for a measured, academic pace.',
        'Avoid playful animations (bounce-in, spin-in, flash-in) — they undermine formal tone.',
        'Use the same animation style consistently within a slide; do not mix more than 2 different enter effects per slide.',
        'Set slide transition to "fade" or "dissolve" with durationMs 400–500 for smooth inter-slide flow.',
        'Canvas FX (slide.fx) should be used sparingly — only on title or section divider slides, not evidence slides.',
      ],
      positioningRules: [
        'Title element must have y ≥ 48 and y ≤ 80 for consistency across slides.',
        'Respect margin of 64px on left/right and 48px on top/bottom.',
        'Leave at least 12px between adjacent elements (element spacing token).',
        'Citation text should be placed at the bottom of the slide (y ≥ 620).',
        'Do not let any element exceed canvas bounds (1280×720).',
      ],
    },
  },

  qualityRules: [
    {
      id: 'academic-citations',
      name: 'Citations on Evidence Slides',
      severity: 'warning',
      applicableStyles: ['academic'],
      description: 'Evidence slides must include a citation in speaker notes or as a label element.',
    },
    {
      id: 'academic-bibliography-exists',
      name: 'Bibliography Slide Exists',
      severity: 'warning',
      applicableStyles: ['academic'],
      description: 'The deck must contain at least one slide with layoutIntent referencing bibliography or references.',
    },
    {
      id: 'academic-figure-labels',
      name: 'Figure and Table Labels',
      severity: 'warning',
      applicableStyles: ['academic'],
      description: 'Image and chart elements should be accompanied by a label or caption text element.',
    },
  ],

  rendererCapabilities: {
    animations:    'full',
    charts:        'full',
    tables:        'full',
    gradients:     'partial',
    clipPaths:     'partial',
    groupElements: 'full',
    textWrapping:  'full',
  },

  roleDocRefs: [
    { path: 'docs/agent-guidance/roles/strategist.md',         role: 'strategist' },
    { path: 'docs/agent-guidance/roles/executor-academic.md',  role: 'executor' },
    { path: 'docs/agent-guidance/standards/shared-constraints.md', role: 'shared' },
  ],
};
