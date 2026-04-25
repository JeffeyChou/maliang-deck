import type { MaliangDeckDiagnostic } from '@maliang-deck/schema';
import type { z } from 'zod';

export type AuthoringDiagnosticCode =
  | 'authoring.invalid-input'
  | 'authoring.unknown-component'
  | 'authoring.invalid-props'
  | 'authoring.expansion-failed'
  | 'authoring.invalid-expanded-deck';

export function createAuthoringDiagnostic(
  code: AuthoringDiagnosticCode,
  message: string,
  path: string,
  detail?: unknown,
): MaliangDeckDiagnostic {
  return {
    code,
    severity: 'error',
    phase: 'compile',
    message,
    path,
    detail,
  };
}

export function diagnosticsFromZodError(
  code: AuthoringDiagnosticCode,
  error: z.ZodError,
  basePath: string,
): MaliangDeckDiagnostic[] {
  return error.issues.map((issue) => createAuthoringDiagnostic(
    code,
    issue.message,
    joinPath(basePath, issue.path),
    { zodCode: issue.code },
  ));
}

export function joinPath(basePath: string, path: Array<string | number>): string {
  if (path.length === 0) return basePath;
  return `${basePath}.${path.map(String).join('.')}`;
}
