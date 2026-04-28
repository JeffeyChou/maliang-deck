import { join } from 'node:path';
import { loadProject, projectRoot, saveProject } from './project.js';
import { RequirementSetSchema, parseJsonWithSchema, type RequirementSet } from './schemas.js';
import { pathExists, readJson, writeJson, writeText } from './fs-utils.js';

export function writeRequirementsTemplate(slugOrPath: string): string {
    const root = projectRoot(slugOrPath);
    const manifest = loadProject(root);
    const requirementsPath = join(root, 'requirements.md');
    if (!pathExists(requirementsPath)) {
        writeText(requirementsPath, `# Requirements for ${manifest.slug}\n\n## Topic and goal\n\nTBD\n\n## Audience\n\nTBD\n\n## Theme / tone\n\nTBD\n\n## Language\n\nen\n\n## Outputs\n\n${manifest.outputFormats.join(', ')}\n\n## Mandatory content\n\n- TBD\n\n## Forbidden content\n\n- TBD\n`);
    }
    saveProject(root, manifest, 'intake');
    return requirementsPath;
}

export function writeRequirementsJson(slugOrPath: string, requirements: RequirementSet): string {
    const root = projectRoot(slugOrPath);
    const manifest = loadProject(root);
    const parsed = RequirementSetSchema.parse(requirements) as RequirementSet;
    const out = join(root, 'requirements.json');
    writeJson(out, parsed);
    saveProject(root, manifest, 'intake');
    return out;
}

export function loadRequirements(slugOrPath: string): RequirementSet | undefined {
    const root = projectRoot(slugOrPath);
    const path = join(root, 'requirements.json');
    if (!pathExists(path))
        return undefined;
    return parseJsonWithSchema(RequirementSetSchema, readJson(path), 'requirements') as RequirementSet;
}
