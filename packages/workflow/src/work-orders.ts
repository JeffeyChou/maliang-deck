import { existsSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { GenerationWorkOrderSchema, type GenerationWorkOrder } from './schemas.js';
import type { WorkOrderGuidance } from './guidance/types.js';

export type CreateGenerationWorkOrderOptions = {
  id: string;
  kind?: GenerationWorkOrder['kind'];
  type?: GenerationWorkOrder['kind'];
  inputArtifacts: string[];
  outputArtifacts: string[];
  constraints: string[];
  sourceRefs?: string[];
  writeScope: string[];
  assignedTo?: string;
  guidance?: WorkOrderGuidance;
  now?: Date;
};

function normalizeScopePath(path: string): string {
  const normalized = normalize(path);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('..') || normalized.startsWith(sep) || normalized.includes(`${sep}..${sep}`)) {
    throw new Error(`Work-order write scope must stay inside project: ${path}`);
  }
  return normalized.split(sep).join('/');
}

export function createGenerationWorkOrder(options: CreateGenerationWorkOrderOptions): GenerationWorkOrder {
  const timestamp = (options.now ?? new Date()).toISOString();
  const kind = options.kind ?? options.type;
  if (!kind) throw new Error('Generation work orders require kind/type');
  return GenerationWorkOrderSchema.parse({
    id: options.id,
    projectSlug: options.id.split('-')[0] ?? 'project',
    kind,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    inputArtifacts: options.inputArtifacts.map((path) => normalizeScopePath(path)),
    outputArtifacts: options.outputArtifacts.map((path) => normalizeScopePath(path)),
    constraints: options.constraints,
    sourceRefs: options.sourceRefs ?? [],
    writeScope: options.writeScope.map((path) => normalizeScopePath(path)),
    assignedTo: options.assignedTo,
    guidance: options.guidance,
  });
}

function scopesOverlap(left: string, right: string): boolean {
  const a = normalizeScopePath(left);
  const b = normalizeScopePath(right);
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

export function assertDisjointSlideDslWriteScopes(workOrders: GenerationWorkOrder[]): void {
  const slideOrders = workOrders.filter((order) => order.kind === 'slide-dsl');
  for (let i = 0; i < slideOrders.length; i += 1) {
    for (let j = i + 1; j < slideOrders.length; j += 1) {
      for (const left of slideOrders[i]!.writeScope) {
        for (const right of slideOrders[j]!.writeScope) {
          if (scopesOverlap(left, right)) {
            throw new Error(`Overlapping slide-dsl write scopes: ${slideOrders[i]!.id} (${left}) and ${slideOrders[j]!.id} (${right})`);
          }
        }
      }
    }
  }
}

export function assertWorkOrderOutputsExist(projectRoot: string, workOrder: GenerationWorkOrder): void {
  if (workOrder.status !== 'done') return;
  for (const outputArtifact of workOrder.outputArtifacts) {
    const fullPath = join(projectRoot, normalizeScopePath(outputArtifact));
    if (!existsSync(fullPath)) {
      throw new Error(`Completed work order ${workOrder.id} is missing output artifact: ${outputArtifact}`);
    }
  }
}

export function markWorkOrderStatus(
  workOrder: GenerationWorkOrder,
  status: GenerationWorkOrder['status'],
  options: { failureReason?: string; now?: Date } = {},
): GenerationWorkOrder {
  return GenerationWorkOrderSchema.parse({
    ...workOrder,
    status,
    failureReason: options.failureReason,
    updatedAt: (options.now ?? new Date()).toISOString(),
  });
}
