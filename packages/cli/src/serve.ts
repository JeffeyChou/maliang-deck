import { existsSync, readFileSync, watchFile } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleEditorRoute } from './editor/http.js';
import { FileBackedEditorStore } from './editor/store.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Root of the monorepo (two levels up from packages/cli/src/)
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

const MIME: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.html': 'text/html',
};

function serveStaticFile(filePath: string, res: ServerResponse): void {
  let content: Buffer;
  try {
    content = readFileSync(filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const mime = MIME[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
}

function serveHtml(store: FileBackedEditorStore, res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(store.html);
}

function createServeHandler(
  store: FileBackedEditorStore,
  runtimeDir: string,
  assetsDir: string,
  deckDir: string,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const editorResult = await handleEditorRoute(req, res, store);
      if (editorResult === 'handled') return;

      const url = req.url ?? '/';
      const pathname = url.split('?')[0];

      if (pathname === '/' || pathname === '/index.html') {
        serveHtml(store, res);
        return;
      }

      if (pathname.startsWith('/runtime/')) {
        const rel = pathname.slice('/runtime/'.length);
        serveStaticFile(join(runtimeDir, rel), res);
        return;
      }

      if (pathname.startsWith('/assets/')) {
        const rel = pathname.slice('/assets/'.length);
        const globalPath = join(assetsDir, rel);
        if (existsSync(globalPath)) {
          serveStaticFile(globalPath, res);
          return;
        }
        // Fall through to deck-local fallback below
      }

      // Fallback: serve from deck file's directory (project-local assets)
      const localPath = join(deckDir, pathname.startsWith('/') ? pathname.slice(1) : pathname);
      serveStaticFile(localPath, res);
    })().catch((error) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: { code: 'internal-error', message: (error as Error).message } }));
    });
  };
}

export async function runServe(file: string, port: number): Promise<void> {
  const deckPath = resolve(file);

  let store: FileBackedEditorStore;
  try {
    store = await FileBackedEditorStore.create(deckPath);
    console.log(`Loaded deck: ${deckPath}`);
  } catch (err) {
    console.error(`Error loading deck: ${(err as Error).message}`);
    process.exit(1);
  }

  const runtimeDir = join(REPO_ROOT, 'runtime');
  const assetsDir = join(REPO_ROOT, 'assets');

  const deckDir = dirname(deckPath);
  const server = createServer(createServeHandler(store, runtimeDir, assetsDir, deckDir));

  server.listen(port, () => {
    console.log(`maliang-deck dev server running at http://localhost:${port}`);
    console.log(`Watching ${deckPath} for changes...`);
  });

  // Watch deck file and re-render on change
  watchFile(deckPath, { interval: 300 }, () => {
    store.reload()
      .then(() => console.log(`[${new Date().toLocaleTimeString()}] Deck reloaded`))
      .catch((err: unknown) => console.error(`Error reloading deck: ${(err as Error).message}`));
  });

  // Keep the process alive
  await new Promise<void>((_, reject) => {
    server.on('error', reject);
  });
}

export { createServeHandler };
