import type { Deck, Element } from '@maliang-deck/schema';
import type { ExportWarning } from './export-report.js';

export type PptxAnimationPlan = {
  slideId: string;
  steps: PptxAnimationStep[];
};

export type PptxAnimationStep = {
  step: number;
  items: PptxAnimationItem[];
};

export type PptxAnimationItem = {
  elementId: string;
  effect: string;
  durationMs: number;
  delayMs: number;
  easing?: string;
  sourceOrder: number;
};

export type PptxAnimationMapping = {
  effect: string;
  pptxTarget: string;
  fallback: string;
  support: 'supported' | 'downgraded';
};

export type PptxAnimationCapabilityEntry = {
  slideId: string;
  step: number;
  elementId: string;
  effect: string;
  status: 'supported' | 'downgraded' | 'unsupported';
  pptxTarget?: string;
  fallback?: string;
};

export type PptxAnimationCapabilityReport = {
  supported: PptxAnimationCapabilityEntry[];
  downgraded: PptxAnimationCapabilityEntry[];
  unsupported: PptxAnimationCapabilityEntry[];
  warnings: ExportWarning[];
};

export const PPTX_ANIMATION_MAPPINGS: Record<string, PptxAnimationMapping> = {
  'fade-up': { effect: 'fade-up', pptxTarget: 'fade+motion-up', fallback: 'fade', support: 'downgraded' },
  'fade-down': { effect: 'fade-down', pptxTarget: 'fade+motion-down', fallback: 'fade', support: 'downgraded' },
  'fade-left': { effect: 'fade-left', pptxTarget: 'fade+motion-left', fallback: 'fade', support: 'downgraded' },
  'fade-right': { effect: 'fade-right', pptxTarget: 'fade+motion-right', fallback: 'fade', support: 'downgraded' },
  'scale-in': { effect: 'scale-in', pptxTarget: 'zoom/scale-entrance', fallback: 'fade', support: 'downgraded' },
  'blur-in': { effect: 'blur-in', pptxTarget: 'fade', fallback: 'fade', support: 'downgraded' },
  'slide-from-left': { effect: 'slide-from-left', pptxTarget: 'fly-in-left', fallback: 'fade', support: 'supported' },
  'slide-from-right': { effect: 'slide-from-right', pptxTarget: 'fly-in-right', fallback: 'fade', support: 'supported' },
  'rise-in': { effect: 'rise-in', pptxTarget: 'fade+motion-up', fallback: 'fade', support: 'downgraded' },
  'zoom-pop': { effect: 'zoom-pop', pptxTarget: 'zoom/scale-entrance', fallback: 'fade', support: 'supported' },
  'rotate-in': { effect: 'rotate-in', pptxTarget: 'spin/rotate-entrance', fallback: 'fade', support: 'downgraded' },
  'flip-in': { effect: 'flip-in', pptxTarget: 'fade', fallback: 'fade', support: 'downgraded' },
  'bounce-in': { effect: 'bounce-in', pptxTarget: 'bounce', fallback: 'fade', support: 'supported' },
  'elastic-in': { effect: 'elastic-in', pptxTarget: 'zoom/scale-entrance', fallback: 'fade', support: 'downgraded' },
  'swing-in': { effect: 'swing-in', pptxTarget: 'swivel', fallback: 'fade', support: 'downgraded' },
  'slide-from-top': { effect: 'slide-from-top', pptxTarget: 'fly-in-top', fallback: 'fade', support: 'supported' },
  'slide-from-bottom': { effect: 'slide-from-bottom', pptxTarget: 'fly-in-bottom', fallback: 'fade', support: 'supported' },
  'drop-in': { effect: 'drop-in', pptxTarget: 'fly-in-top', fallback: 'fade', support: 'downgraded' },
  'zoom-in': { effect: 'zoom-in', pptxTarget: 'zoom/scale-entrance', fallback: 'fade', support: 'supported' },
  'shrink-in': { effect: 'shrink-in', pptxTarget: 'zoom/scale-entrance', fallback: 'fade', support: 'downgraded' },
  'spin-in': { effect: 'spin-in', pptxTarget: 'spin/rotate-entrance', fallback: 'fade', support: 'downgraded' },
  'blur-zoom': { effect: 'blur-zoom', pptxTarget: 'fade', fallback: 'fade', support: 'downgraded' },
  'skew-in': { effect: 'skew-in', pptxTarget: 'fade', fallback: 'fade', support: 'downgraded' },
  'stretch-x': { effect: 'stretch-x', pptxTarget: 'wipe-right', fallback: 'fade', support: 'downgraded' },
  'stretch-y': { effect: 'stretch-y', pptxTarget: 'wipe-down', fallback: 'fade', support: 'downgraded' },
  'flash-in': { effect: 'flash-in', pptxTarget: 'flash', fallback: 'fade', support: 'supported' },
};

function collectAnimatedItems(elements: Element[], sourceOrder: { value: number }): PptxAnimationItem[] {
  const items: PptxAnimationItem[] = [];
  for (const element of elements) {
    const currentOrder = sourceOrder.value++;
    if (element.animation?.enter) {
      items.push({
        elementId: element.id,
        effect: element.animation.enter,
        durationMs: element.animation.duration ?? 500,
        delayMs: element.animation.delay ?? 0,
        easing: element.animation.easing,
        step: undefined as never,
        sourceOrder: currentOrder,
      } as PptxAnimationItem & { step: number });
    }
    if (element.type === 'group' || element.type === 'layout') {
      items.push(...collectAnimatedItems(element.elements, sourceOrder));
    }
  }
  return items;
}

export function generatePptxAnimationPlan(deck: Deck): PptxAnimationPlan[] {
  return deck.slides.map((slide) => {
    const sourceOrder = { value: 0 };
    const byStep = new Map<number, PptxAnimationItem[]>();

    const visit = (elements: Element[]): void => {
      for (const element of elements) {
        const currentOrder = sourceOrder.value++;
        if (element.animation?.enter) {
          const step = element.animation.step ?? 0;
          const item: PptxAnimationItem = {
            elementId: element.id,
            effect: element.animation.enter,
            durationMs: element.animation.duration ?? 500,
            delayMs: element.animation.delay ?? 0,
            easing: element.animation.easing,
            sourceOrder: currentOrder,
          };
          byStep.set(step, [...(byStep.get(step) ?? []), item]);
        }
        if (element.type === 'group' || element.type === 'layout') visit(element.elements);
      }
    };

    visit(slide.elements);

    const steps = [...byStep.entries()]
      .sort(([a], [b]) => a - b)
      .map(([step, items]) => ({
        step,
        items: items.sort((a, b) => a.sourceOrder - b.sourceOrder),
      }));

    return { slideId: slide.id, steps };
  });
}

export function classifyPptxAnimationSupport(plans: PptxAnimationPlan[]): PptxAnimationCapabilityReport {
  const report: PptxAnimationCapabilityReport = {
    supported: [],
    downgraded: [],
    unsupported: [],
    warnings: [],
  };

  for (const slide of plans) {
    for (const step of slide.steps) {
      for (const item of step.items) {
        const mapping = PPTX_ANIMATION_MAPPINGS[item.effect];
        if (!mapping) {
          const entry: PptxAnimationCapabilityEntry = {
            slideId: slide.slideId,
            step: step.step,
            elementId: item.elementId,
            effect: item.effect,
            status: 'unsupported',
            fallback: 'fade',
          };
          report.unsupported.push(entry);
          report.warnings.push({
            code: 'pptx.animation.unsupported',
            message: `Unsupported PPTX animation effect "${item.effect}" on ${slide.slideId}/${item.elementId}; static export remains valid and fallback is fade.`,
            detail: entry,
          });
          continue;
        }

        const entry: PptxAnimationCapabilityEntry = {
          slideId: slide.slideId,
          step: step.step,
          elementId: item.elementId,
          effect: item.effect,
          status: mapping.support,
          pptxTarget: mapping.pptxTarget,
          fallback: mapping.fallback,
        };
        report[mapping.support].push(entry);
        if (mapping.support === 'downgraded') {
          report.warnings.push({
            code: 'pptx.animation.downgraded',
            message: `PPTX animation effect "${item.effect}" on ${slide.slideId}/${item.elementId} uses fallback-compatible mapping "${mapping.fallback}".`,
            detail: entry,
          });
        }
      }
    }
  }

  return report;
}

export const createPptxAnimationPlan = generatePptxAnimationPlan;
export const assessPptxAnimationPlan = classifyPptxAnimationSupport;
