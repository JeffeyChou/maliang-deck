import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { resolveProjectMaliangDeckConfig, type MaliangDeckCliOverrides } from './config.js';
import { ensureDir, writeJson, writeText } from './fs-utils.js';
import { resolveMaliangDeckConfig } from './config.js';
import type { ExtractionProvider } from './docling-runner.js';
import type { ExtractedAsset, ExtractedBlock, ExtractedMaterial } from './schemas.js';

type ContentItem = Record<string, unknown>;

export type NormalizationResult = {
  materials: ExtractedMaterial[];
  blocks: ExtractedBlock[];
  assets: ExtractedAsset[];
  warnings: string[];
};

export type NormalizeExtractionOptions = {
  provider?: ExtractionProvider;
  unpackedRoot?: string;
};

function findFiles(root: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const stats = statSync(path);
      if (stats.isDirectory()) visit(path);
      else if (predicate(path)) out.push(path);
    }
  };
  visit(root);
  return out.sort();
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function textOf(item: ContentItem): string {
  const direct = asString(item.text ?? item.content ?? item.markdown ?? item.md ?? item.value);
  if (direct) return direct;
  if (Array.isArray(item.caption)) return item.caption.map(asString).filter(Boolean).join(' ');
  return asString(item.caption) ?? '';
}

function kindOf(item: ContentItem): ExtractedBlock['kind'] {
  const raw = String(item.type ?? item.kind ?? '').toLowerCase();
  if (raw.includes('title') || raw === 'heading') return 'title';
  if (raw.includes('list')) return 'list';
  if (raw.includes('table')) return 'table';
  if (raw.includes('equation') || raw.includes('formula')) return 'equation';
  if (raw.includes('chart')) return 'chart';
  if (raw.includes('image') || raw.includes('figure')) return 'image';
  if (raw.includes('text') || raw.includes('paragraph')) return 'text';
  return textOf(item) ? 'text' : 'unknown';
}

function assetKindOf(kind: ExtractedBlock['kind'], imagePath: string): ExtractedAsset['kind'] {
  if (kind === 'image' || kind === 'table' || kind === 'chart' || kind === 'equation') return kind;
  const ext = extname(imagePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext) ? 'image' : 'unknown';
}

function pageIndexOf(item: ContentItem): number | undefined {
  const value = item.page_idx ?? item.pageIndex ?? item.page_index ?? item.page;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/u.test(value)) return Number(value);
  return undefined;
}

function normalizeBBox(value: unknown): ExtractedAsset['bbox'] | undefined {
  if (Array.isArray(value) && value.length >= 4) {
    const [x1, y1, x2, y2] = value.map(Number);
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const left = Number(record.x ?? record.left ?? record.l);
    const top = Number(record.y ?? record.top ?? record.t);
    const right = Number(record.r ?? record.right);
    const bottom = Number(record.b ?? record.bottom);
    const width = Number(record.width ?? record.w ?? (Number.isFinite(right) ? Math.abs(right - left) : undefined));
    const height = Number(record.height ?? record.h ?? (Number.isFinite(bottom) ? Math.abs(bottom - top) : undefined));
    const x = Number.isFinite(right) ? Math.min(left, right) : left;
    const y = Number.isFinite(bottom) ? Math.min(top, bottom) : top;
    if ([x, y, width, height].every(Number.isFinite)) return { x, y, width, height };
  }
  return undefined;
}

function imagePathOf(item: ContentItem): string | undefined {
  return asString(item.img_path ?? item.image_path ?? item.asset_path ?? item.path ?? item.url);
}

function captionOf(item: ContentItem): string | undefined {
  if (Array.isArray(item.caption)) return item.caption.map(asString).filter(Boolean).join(' ') || undefined;
  return asString(item.caption);
}

function readContentItems(contentListPath: string): ContentItem[] {
  const parsed = JSON.parse(readFileSync(contentListPath, 'utf-8')) as unknown;
  if (Array.isArray(parsed)) return parsed.filter((item): item is ContentItem => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const candidates = [record.content_list, record.items, record.blocks];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate.filter((item): item is ContentItem => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
    }
  }
  return [];
}

function markdownItems(markdownPath: string): ContentItem[] {
  const markdown = readFileSync(markdownPath, 'utf-8');
  return markdown
    .split(/\n{2,}/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((text, index) => ({ type: index === 0 ? 'title' : 'text', text }));
}

function isInside(parent: string, child: string): boolean {
  const root = resolve(parent);
  const target = resolve(child);
  return target === root || target.startsWith(`${root}/`);
}

export function normalizeExtraction(slugOrPath: string, options: NormalizeExtractionOptions = {}): NormalizationResult {
  const cliOverrides: MaliangDeckCliOverrides | undefined = options.provider ? { provider: options.provider, extraction: { provider: options.provider } } : undefined;
  const { root, config } = resolveProjectMaliangDeckConfig(slugOrPath, { cliOverrides });
  const manifest = loadProject(root);
  const provider = options.provider ?? config.extraction.provider;
  const unpackedRoot = options.unpackedRoot ?? join(root, 'extraction', provider, 'raw');
  const normalizedRoot = join(root, 'extraction', 'normalized');
  ensureDir(normalizedRoot);

  const materialDirs = existsSync(unpackedRoot)
    ? readdirSync(unpackedRoot).map((name) => join(unpackedRoot, name)).filter((path) => statSync(path).isDirectory()).sort()
    : [];

  const materials: ExtractedMaterial[] = [];
  const blocks: ExtractedBlock[] = [];
  const assets: ExtractedAsset[] = [];
  const warnings: string[] = [];

  materialDirs.forEach((materialDir, materialIndex) => {
    const materialId = basename(materialDir) || `material-${materialIndex + 1}`;
    const markdownFiles = findFiles(materialDir, (path) => basename(path).toLowerCase() === 'full.md' || extname(path).toLowerCase() === '.md');
    const markdown = markdownFiles.find((path) => basename(path).toLowerCase() === 'source.md') ?? markdownFiles[0];
    const contentList = findFiles(materialDir, (path) => /content[_-]?list\.json$/iu.test(basename(path)))[0];
    const materialAssetIds: string[] = [];

    let items: ContentItem[] = [];
    if (contentList) items = readContentItems(contentList);
    else if (markdown) items = markdownItems(markdown);
    else warnings.push(`No source.md, full.md, or content_list.json found for ${provider}/${materialId}`);

    items.forEach((item, index) => {
      const kind = kindOf(item);
      const pageIndex = pageIndexOf(item);
      const blockId = `${materialId}-block-${index + 1}`;
      const assetRefs: string[] = [];
      const sourceAssetRel = imagePathOf(item);

      if (sourceAssetRel) {
        const sourceAssetPath = join(materialDir, sourceAssetRel);
        const assetId = `${materialId}-asset-${assets.length + 1}`;
        if (!isInside(materialDir, sourceAssetPath)) {
          warnings.push(`Skipped asset outside material directory: ${sourceAssetRel}`);
        } else {
          if (!existsSync(sourceAssetPath)) {
            warnings.push(`Missing asset ${sourceAssetRel} for ${blockId}`);
          }
          assets.push({
            id: assetId,
            materialId,
            kind: assetKindOf(kind, sourceAssetRel),
            sourcePath: relative(root, sourceAssetPath),
            pageIndex,
            bbox: normalizeBBox(item.bbox),
            caption: captionOf(item),
            sourceOrder: index,
          });
          assetRefs.push(assetId);
          materialAssetIds.push(assetId);
        }
      }

      blocks.push({
        id: blockId,
        materialId,
        kind,
        text: textOf(item),
        pageIndex,
        sourceOrder: index,
        assetRefs,
      });
    });

    materials.push({
      id: materialId,
      sourceId: manifest.sources[materialIndex]?.id ?? `source-${materialIndex + 1}`,
      markdownPath: markdown ? relative(root, markdown) : undefined,
      contentListPath: contentList ? relative(root, contentList) : undefined,
      title: materialId,
    });
  });

  writeJson(join(normalizedRoot, 'materials.json'), materials);
  writeJson(join(normalizedRoot, 'blocks.json'), blocks);
  writeJson(join(normalizedRoot, 'assets.json'), assets);
  writeText(join(normalizedRoot, 'source-summary.md'), [
    `# Source Summary for ${manifest.slug}`,
    '',
    `Materials: ${materials.length}`,
    `Blocks: ${blocks.length}`,
    `Assets: ${assets.length}`,
    '',
    ...warnings.map((warning) => `- Warning: ${warning}`),
    '',
  ].join('\n'));
  saveProject(root, manifest, 'normalized');
  return { materials, blocks, assets, warnings };
}
