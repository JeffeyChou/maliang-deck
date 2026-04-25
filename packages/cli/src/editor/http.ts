import type { IncomingMessage, ServerResponse } from 'node:http';
import { FileBackedEditorStore, EditorStoreError } from './store.js';

export type EditorRouteResult = 'handled' | 'pass';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, error: unknown): void {
  if (error instanceof EditorStoreError) {
    sendJson(res, error.status, {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        path: error.path,
        validationErrors: error.validationErrors,
        warnings: error.warnings,
      },
    });
    return;
  }
  sendJson(res, 500, {
    ok: false,
    error: {
      code: 'internal-error',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export async function handleEditorRoute(
  req: IncomingMessage,
  res: ServerResponse,
  store: FileBackedEditorStore,
): Promise<EditorRouteResult> {
  const pathname = (req.url ?? '/').split('?')[0];
  if (pathname !== '/__maliang-deck/editor' && pathname !== '/__maliang-deck/editor/save') {
    return 'pass';
  }

  try {
    if (pathname === '/__maliang-deck/editor') {
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'Use GET for editor capabilities.' } });
        return 'handled';
      }
      sendJson(res, 200, store.getCapability());
      return 'handled';
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'Use POST for editor saves.' } });
      return 'handled';
    }

    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: { code: 'invalid-json', message: (error as Error).message } });
      return 'handled';
    }
    sendJson(res, 200, await store.save(body));
    return 'handled';
  } catch (error) {
    sendError(res, error);
    return 'handled';
  }
}
