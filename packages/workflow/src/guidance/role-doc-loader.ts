import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type RoleDocFrontmatter = {
    dslFieldReferences?: string[];
    stageApplicability?: string[];
    [key: string]: unknown;
};

export type LoadedRoleDoc = {
    content: string;
    frontmatter: RoleDocFrontmatter;
    digest: string;
};

/**
 * Parse YAML frontmatter from a markdown file.
 * Only handles simple key: value and key: [list] forms — no full YAML parser
 * needed for the frontmatter schema used in role docs.
 */
function parseFrontmatter(raw: string): { frontmatter: RoleDocFrontmatter; body: string } {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/m.exec(raw);
    if (!match)
        return { frontmatter: {}, body: raw };
    const yamlBlock = match[1] ?? '';
    const body = match[2] ?? '';
    const frontmatter: RoleDocFrontmatter = {};
    for (const line of yamlBlock.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        // Handle inline lists: key: [a, b, c]
        const inlineListMatch = /^(\w[\w-]*):\s*\[([^\]]*)\]\s*$/.exec(trimmed);
        if (inlineListMatch) {
            const key = inlineListMatch[1];
            const items = inlineListMatch[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
            frontmatter[key] = items;
            continue;
        }
        // Handle simple scalar: key: value
        const scalarMatch = /^(\w[\w-]*):\s*(.+)$/.exec(trimmed);
        if (scalarMatch) {
            frontmatter[scalarMatch[1]] = scalarMatch[2].trim();
        }
    }
    return { frontmatter, body };
}

/**
 * Extract specific sections from markdown content by heading name.
 * Returns the heading line + all lines until the next same-or-higher heading.
 */
function extractSections(markdown: string, sections: string[]): string {
    if (sections.length === 0)
        return markdown;
    const lines = markdown.split('\n');
    const result: string[] = [];
    let capturing = false;
    let captureLevel = 0;
    for (const line of lines) {
        const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();
            if (sections.some((s) => s.toLowerCase() === title.toLowerCase())) {
                capturing = true;
                captureLevel = level;
                result.push(line);
                continue;
            }
            if (capturing && level <= captureLevel) {
                capturing = false;
            }
        }
        if (capturing)
            result.push(line);
    }
    return result.join('\n');
}

/**
 * Load a role doc from an absolute path, optionally extracting specific sections.
 * Returns the extracted content, parsed frontmatter, and a SHA-256 digest.
 */
export function loadRoleDoc(absolutePath: string, sections?: string[]): LoadedRoleDoc {
    const raw = readFileSync(absolutePath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const content = sections && sections.length > 0 ? extractSections(body, sections) : body;
    const digest = createHash('sha256').update(content).digest('hex').slice(0, 16);
    return { content, frontmatter, digest };
}
