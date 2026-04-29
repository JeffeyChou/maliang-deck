import type { ImageElement } from '../../../schema/src/types.js';
import { animationDataAttrs, buildTransform, buildOpacityAttrs, n } from '../utils.js';
import { readFileSync } from 'fs';
import { join, extname, isAbsolute } from 'path';

const MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

function fitToPreserveAspectRatio(fit: ImageElement['fit']): string {
    switch (fit) {
        case 'contain':
            return 'xMidYMid meet';
        case 'cover':
            return 'xMidYMid slice';
        case 'none':
            return 'none';
        case 'fill':
        default:
            return 'none';
    }
}

export function renderImage(el: ImageElement, basePath?: string): string {
    const transform = buildTransform(el);
    const opacityAttrs = buildOpacityAttrs(el.opacity);
    let href: string;
    if (el.src.startsWith('data:')) {
        href = el.src;
    }
    else {
        const resolvedPath = isAbsolute(el.src)
            ? el.src
            : join(basePath ?? process.cwd(), el.src);
        try {
            const buffer = readFileSync(resolvedPath);
            const ext = extname(resolvedPath).toLowerCase();
            const mime = MIME_MAP[ext] ?? 'application/octet-stream';
            href = `data:${mime};base64,${buffer.toString('base64')}`;
        }
        catch {
            // If file can't be read, fall back to the original src so the SVG is
            // still structurally valid (ppt-master will reject it but won't crash).
            href = el.src;
        }
    }
    const par = fitToPreserveAspectRatio(el.fit);
    const attrs = [
        `x="${n(el.x)}"`,
        `y="${n(el.y)}"`,
        `width="${n(el.width)}"`,
        `height="${n(el.height)}"`,
        `href="${href}"`,
        `preserveAspectRatio="${par}"`,
        ...animationDataAttrs(el),
        opacityAttrs,
        transform ? `transform="${transform}"` : '',
    ]
        .filter(Boolean)
        .join(' ');
    return `<image ${attrs}/>`;
}
