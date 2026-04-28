export class WorkflowError extends Error {
    readonly options: {
        recoverable?: boolean;
        code?: string;
    };

    constructor(message: string, options: { recoverable?: boolean; code?: string } = {}) {
        super(message);
        this.options = options;
    }

    get recoverable(): boolean {
        return this.options.recoverable ?? false;
    }

    get code(): string | undefined {
        return this.options.code;
    }
}

export type RetryAttempt = {
    attempt: number;
    reason: string;
    recoverable: boolean;
    success?: boolean;
    code?: string;
    assumptions?: string[];
};

export type RetryPolicyResult = {
    shouldRetry: boolean;
    attempts: RetryAttempt[];
    escalation?: string;
};

export type RunWithRetryResult<T> =
    | {
          ok: true;
          value: T;
          attempts: RetryAttempt[];
      }
    | {
          ok: false;
          error: {
              message: string;
              recoverable: boolean;
              code?: string;
          };
          attempts: RetryAttempt[];
      };

export function recordRetry(
    attempts: RetryAttempt[],
    reason: string,
    recoverable = true,
    maxAttempts = 3,
): RetryPolicyResult {
    const nextAttempts = [...attempts, { attempt: attempts.length + 1, reason, recoverable, success: false }];
    const shouldRetry = recoverable && nextAttempts.length < maxAttempts;
    return {
        shouldRetry,
        attempts: nextAttempts,
        escalation: shouldRetry ? undefined : `Retry limit reached after ${nextAttempts.length} attempt(s): ${reason}`,
    };
}

function classifyError(
    error: unknown,
    isRecoverable?: (error: unknown) => boolean,
): { message: string; recoverable: boolean; code?: string } {
    const workflowError = error instanceof WorkflowError ? error : undefined;
    const recoverable = isRecoverable?.(error) ?? workflowError?.recoverable ?? false;
    const message = error instanceof Error ? error.message : String(error);
    return { message, recoverable, code: workflowError?.code };
}

export async function runWithRetry<T>(
    operation: () => T | Promise<T>,
    options: {
        maxAttempts?: number;
        assumptions?: string[];
        isRecoverable?: (error: unknown) => boolean;
    } = {},
): Promise<RunWithRetryResult<T>> {
    const maxAttempts = options.maxAttempts ?? 3;
    const attempts: RetryAttempt[] = [];
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const value = await operation();
            attempts.push({ attempt, reason: 'success', recoverable: false, success: true, assumptions: options.assumptions });
            return { ok: true, value, attempts };
        } catch (error) {
            const classified = classifyError(error, options.isRecoverable);
            attempts.push({
                attempt,
                reason: classified.message,
                recoverable: classified.recoverable,
                success: false,
                code: classified.code,
                assumptions: options.assumptions,
            });
            if (!classified.recoverable || attempt >= maxAttempts) {
                return { ok: false, error: classified, attempts };
            }
        }
    }
    return { ok: false, error: { message: 'retry loop exhausted', recoverable: false }, attempts };
}
