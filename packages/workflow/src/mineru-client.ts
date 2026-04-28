import { readFileSync } from 'node:fs';
import {
    MinerUBatchResultResponseSchema,
    MinerUBatchTaskCreateResponseSchema,
    MinerUCreateTaskResponseSchema,
    MinerUFileUrlsBatchResponseSchema,
    MinerUTaskResultResponseSchema,
    type MinerUBatchResultResponse,
    type MinerUTaskResultResponse,
} from './schemas.js';

export type FetchInit = Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string>;
};

export type FetchResponseLike = Pick<Response, 'ok' | 'status'> & {
    statusText?: string;
    json(): Promise<unknown>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
};

export type FetchLike = (input: string | URL, init?: FetchInit) => Promise<FetchResponseLike>;

export type MinerUClientConfig = {
    apiBaseUrl?: string;
    baseUrl?: string;
    token?: string;
    fetch?: FetchLike;
    fetchImpl?: FetchLike;
};

export type MinerUExtractOptions = {
    model?: 'vlm' | string;
    model_version?: 'vlm' | string;
    enable_table?: boolean;
    enable_formula?: boolean;
    is_ocr?: boolean;
};

export type MinerURequestArtifact = {
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
};

export type MinerUResponse<T extends object> = T & {
    message: string;
    traceId?: string;
    request: MinerURequestArtifact;
};

export class MinerUWorkflowError extends Error {
    readonly code: string;
    readonly traceId?: string | undefined;
    readonly name = 'MinerUWorkflowError';

    constructor(message: string, code: string, traceId?: string | undefined) {
        super(message);
        this.code = code;
        this.traceId = traceId;
    }
}

export function defaultMinerUOptions(options: MinerUExtractOptions = {}): {
    model: string;
    model_version: string;
    enable_table: boolean;
    enable_formula: boolean;
    is_ocr: boolean;
} {
    const modelVersion = options.model_version ?? options.model ?? 'vlm';
    return {
        model: modelVersion,
        model_version: modelVersion,
        enable_table: options.enable_table ?? true,
        enable_formula: options.enable_formula ?? true,
        is_ocr: options.is_ocr ?? false,
    };
}

export function redactSecret(value: string | undefined, secret?: string): string | undefined {
    if (!value || !secret)
        return value;
    return value.split(secret).join('<redacted>');
}

export function redactHeaders(headers: Record<string, string>, token?: string): Record<string, string> {
    const redacted = { ...headers };
    for (const [key, value] of Object.entries(redacted)) {
        if (token && value.includes(token))
            redacted[key] = redactSecret(value, token) ?? value;
    }
    return redacted;
}

export function parseEnvText(text: string): Record<string, string> {
    const values: Record<string, string> = {};
    for (const rawLine of text.split(/\r?\n/u)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(line);
        if (!match)
            continue;
        const [, key, rawValue] = match;
        let value = rawValue.trim();
        const quote = value[0];
        if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
            value = value.slice(1, -1);
        } else {
            value = value.replace(/\s+#.*$/u, '').trim();
        }
        values[key] = value;
    }
    return values;
}

export function readMinerUTokenFromEnvFile(envFilePath = '.env'): string | undefined {
    try {
        const values = parseEnvText(readFileSync(envFilePath, 'utf-8'));
        return values.MINERU_API_TOKEN || undefined;
    } catch (error: any) {
        if (error.code === 'ENOENT')
            return undefined;
        throw error;
    }
}

export function resolveMinerUApiToken(options: {
    env?: NodeJS.ProcessEnv;
    envFilePath?: string;
} = {}): string | undefined {
    const envToken = options.env?.MINERU_API_TOKEN ?? process.env.MINERU_API_TOKEN;
    return envToken?.trim() || readMinerUTokenFromEnvFile(options.envFilePath)?.trim() || undefined;
}

function normalizeApiBaseUrl(config: MinerUClientConfig): string {
    const raw = config.apiBaseUrl ?? config.baseUrl ?? 'https://mineru.net/api/v4';
    return raw.replace(/\/+$/u, '');
}

function authHeaders(token?: string): Record<string, string> {
    const result: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token)
        result.Authorization = `Bearer ${token}`;
    return result;
}

function traceIdOf(value: unknown): string | undefined {
    if (value && typeof value === 'object' && 'trace_id' in value && typeof (value as any).trace_id === 'string') {
        return (value as any).trace_id;
    }
    return undefined;
}

function responseMessageOf(value: unknown): string {
    if (value && typeof value === 'object' && 'msg' in value && typeof (value as any).msg === 'string') {
        return (value as any).msg;
    }
    return 'ok';
}

function ensureSuccessfulCode(value: unknown, label: string): void {
    if (value && typeof value === 'object' && 'code' in value && typeof (value as any).code === 'number' && (value as any).code !== 0) {
        throw new MinerUWorkflowError(`${label} returned code ${(value as any).code}: ${responseMessageOf(value)}`, 'MINERU_API_ERROR', traceIdOf(value));
    }
}

function wrapSchema<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: unknown[]; message: string }> } } }, value: unknown, label: string): T {
    try {
        ensureSuccessfulCode(value, label);
        const result = schema.safeParse(value);
        if (result.success)
            return result.data;
        throw new Error(`${label} validation failed: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
    } catch (error) {
        if (error instanceof MinerUWorkflowError)
            throw error;
        throw new MinerUWorkflowError((error as Error).message, 'MINERU_RESPONSE_SCHEMA_ERROR', traceIdOf(value));
    }
}

function assertDoneItemsHaveZip(value: any): void {
    const data = value.data;
    if (data && 'task_id' in data && data.state === 'done' && !data.full_zip_url) {
        throw new MinerUWorkflowError('MinerU task result is done but missing full_zip_url', 'MINERU_RESPONSE_SCHEMA_ERROR', value.trace_id);
    }
    if (data && 'batch_id' in data) {
        for (const item of data.extract_result ?? []) {
            if (item.state === 'done' && !item.full_zip_url) {
                throw new MinerUWorkflowError('MinerU batch result item is done but missing full_zip_url', 'MINERU_RESPONSE_SCHEMA_ERROR', value.trace_id);
            }
        }
    }
}

export function parseMinerUTaskResult(value: unknown): MinerUTaskResultResponse {
    const parsed = wrapSchema(MinerUTaskResultResponseSchema, value, 'MinerU task result response');
    assertDoneItemsHaveZip(parsed);
    return parsed;
}

export function parseMinerUBatchResult(value: unknown): MinerUBatchResultResponse {
    const parsed = wrapSchema(MinerUBatchResultResponseSchema, value, 'MinerU batch result response');
    assertDoneItemsHaveZip(parsed);
    return parsed;
}

export class MinerUClient {
    private readonly apiBaseUrl: string;
    private readonly token?: string;
    private readonly fetcher: FetchLike;

    constructor(config: MinerUClientConfig = {}) {
        this.apiBaseUrl = normalizeApiBaseUrl(config);
        this.token = config.token;
        this.fetcher = config.fetch ?? config.fetchImpl ?? fetch;
    }

    private async requestJson<T extends object>(
        endpoint: string,
        init: {
            method?: string;
            body?: unknown;
            schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: unknown[]; message: string }> } } };
            label: string;
        },
    ): Promise<MinerUResponse<T>> {
        const method = init.method ?? 'GET';
        const headers = authHeaders(this.token);
        const request: MinerURequestArtifact = {
            endpoint,
            method,
            headers: redactHeaders(headers, this.token),
            body: init.body,
        };
        const response = await this.fetcher(`${this.apiBaseUrl}${endpoint}`, {
            method,
            headers,
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
        });
        const value = await response.json();
        if (!response.ok) {
            throw new MinerUWorkflowError(`MinerU HTTP ${response.status}: ${response.statusText ?? responseMessageOf(value)}`, 'MINERU_HTTP_ERROR', traceIdOf(value));
        }
        const parsed = wrapSchema(init.schema, value, init.label);
        if ((init.schema as any) === MinerUTaskResultResponseSchema || (init.schema as any) === MinerUBatchResultResponseSchema) {
            assertDoneItemsHaveZip(parsed);
        }
        return {
            ...parsed,
            message: responseMessageOf(value),
            traceId: traceIdOf(value),
            request,
        };
    }

    async createRemoteUrlTask(options: { url: string } & MinerUExtractOptions): Promise<MinerUResponse<{
        code: number;
        msg: string;
        trace_id?: string | undefined;
        data?: { task_id: string } | undefined;
    }>> {
        const { url, ...extractOptions } = options;
        return this.requestJson('/extract/task', {
            method: 'POST',
            body: { url, ...defaultMinerUOptions(extractOptions) },
            schema: MinerUCreateTaskResponseSchema,
            label: 'MinerU create task response',
        });
    }

    async createFileUploadUrls(options: {
        files: Array<{ name: string; dataId: string; isOcr?: boolean }>;
    } & MinerUExtractOptions): Promise<MinerUResponse<{
        code: number;
        msg: string;
        trace_id?: string | undefined;
        data?: { batch_id: string; file_urls: string[] } | undefined;
    }>> {
        const { files, ...extractOptions } = options;
        const defaults = defaultMinerUOptions(extractOptions);
        return this.requestJson('/file-urls/batch', {
            method: 'POST',
            body: {
                ...defaults,
                files: files.map((file) => ({ name: file.name, data_id: file.dataId, is_ocr: file.isOcr ?? defaults.is_ocr })),
            },
            schema: MinerUFileUrlsBatchResponseSchema,
            label: 'MinerU file URLs batch response',
        });
    }

    async uploadFileToUrl(uploadUrl: string, bytes: BodyInit): Promise<void> {
        const response = await this.fetcher(uploadUrl, { method: 'PUT', body: bytes });
        if (!response.ok)
            throw new MinerUWorkflowError(`MinerU upload HTTP ${response.status}: ${response.statusText ?? 'upload failed'}`, 'MINERU_UPLOAD_ERROR');
    }

    async createBatchUrlTask(options: {
        files: Array<{ url: string; dataId: string; isOcr?: boolean }>;
    } & MinerUExtractOptions): Promise<MinerUResponse<{
        code: number;
        msg: string;
        trace_id?: string | undefined;
        data?: { batch_id: string } | undefined;
    }>> {
        const { files, ...extractOptions } = options;
        const defaults = defaultMinerUOptions(extractOptions);
        return this.requestJson('/extract/task/batch', {
            method: 'POST',
            body: {
                ...defaults,
                files: files.map((file) => ({ url: file.url, data_id: file.dataId, is_ocr: file.isOcr ?? defaults.is_ocr })),
            },
            schema: MinerUBatchTaskCreateResponseSchema,
            label: 'MinerU batch URL task response',
        });
    }

    async getTaskResult(taskId: string): Promise<MinerUResponse<MinerUTaskResultResponse>> {
        return this.requestJson(`/extract/task/${encodeURIComponent(taskId)}`, {
            schema: MinerUTaskResultResponseSchema,
            label: 'MinerU task result response',
        });
    }

    async getBatchTaskResults(batchId: string): Promise<MinerUResponse<MinerUBatchResultResponse>> {
        return this.requestJson(`/extract-results/batch/${encodeURIComponent(batchId)}`, {
            schema: MinerUBatchResultResponseSchema,
            label: 'MinerU batch result response',
        });
    }
}

export async function createSingleUrlTask(
    config: MinerUClientConfig,
    url: string,
    options?: MinerUExtractOptions,
): Promise<MinerUResponse<{
    code: number;
    msg: string;
    trace_id?: string | undefined;
    data?: { task_id: string } | undefined;
}>> {
    return new MinerUClient(config).createRemoteUrlTask({ url, ...options });
}

export async function createFileUrlsBatch(
    config: MinerUClientConfig,
    files: { fileName?: string; name?: string; dataId: string }[],
    options?: MinerUExtractOptions,
): Promise<MinerUResponse<{
    code: number;
    msg: string;
    trace_id?: string | undefined;
    data?: { batch_id: string; file_urls: string[] } | undefined;
}>> {
    return new MinerUClient(config).createFileUploadUrls({
        files: files.map((file) => ({ name: file.name ?? file.fileName ?? file.dataId, dataId: file.dataId })),
        ...options,
    });
}

export async function createBatchUrlTask(
    config: MinerUClientConfig,
    urls: string[] | Array<{ url: string; dataId?: string }>,
    options?: MinerUExtractOptions,
): Promise<MinerUResponse<{
    code: number;
    msg: string;
    trace_id?: string | undefined;
    data?: { batch_id: string } | undefined;
}>> {
    const files = urls.map((entry, index) =>
        typeof entry === 'string'
            ? { url: entry, dataId: `file-${index + 1}` }
            : { url: entry.url, dataId: entry.dataId ?? `file-${index + 1}` },
    );
    return new MinerUClient(config).createBatchUrlTask({ files, ...options });
}

export async function getTaskResult(config: MinerUClientConfig, taskId: string): Promise<MinerUTaskResultResponse> {
    return parseMinerUTaskResult(await (await new MinerUClient(config).getTaskResult(taskId)));
}

export async function getBatchResult(config: MinerUClientConfig, batchId: string): Promise<MinerUBatchResultResponse> {
    return parseMinerUBatchResult(await (await new MinerUClient(config).getBatchTaskResults(batchId)));
}
