/**
 * Generates a self-contained serve.js script for editable HTML exports.
 * The script is a zero-dependency Node.js HTTP server that:
 * - Serves static files from the export directory
 * - Handles editor save endpoint (PATCH deck.json)
 */
export function generateServeScript(port = 3000): string {
  return `#!/usr/bin/env node
/* maliang-deck – standalone editor server
 * Usage: node serve.js [--port 3000]
 * Serves this folder as an interactive presentation with live editing.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DECK_PATH = path.join(ROOT, 'deck.json');
const PORT = (() => {
  const idx = process.argv.indexOf('--port');
  return idx !== -1 && process.argv[idx + 1] ? Number(process.argv[idx + 1]) : ${port};
})();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

/** Minimal editor patch: apply updateElement changes to deck JSON. */
function applyOps(deck, ops) {
  for (const op of ops) {
    if (op.op === 'updateElement') {
      const slide = deck.slides.find((s) => s.id === op.slideId);
      if (!slide) throw new Error('Slide not found: ' + op.slideId);
      const el = slide.elements.find((e) => e.id === op.elementId);
      if (!el) throw new Error('Element not found: ' + op.elementId);
      Object.assign(el, op.changes);
    } else if (op.op === 'reorderSlides') {
      const byId = new Map(deck.slides.map((s) => [s.id, s]));
      deck.slides = op.slideIds.map((id) => {
        const s = byId.get(id);
        if (!s) throw new Error('Slide not found: ' + id);
        return s;
      });
    } else if (op.op === 'deleteSlide') {
      const idx = deck.slides.findIndex((s) => s.id === op.slideId);
      if (idx < 0) throw new Error('Slide not found: ' + op.slideId);
      if (deck.slides.length <= 1) throw new Error('Cannot delete last slide');
      deck.slides.splice(idx, 1);
    }
  }
  return deck;
}

function computeRevision() {
  const stat = fs.statSync(DECK_PATH);
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(DECK_PATH).update('\\0')
    .update(String(stat.mtimeMs)).update('\\0')
    .update(String(stat.size))
    .digest('hex');
}

async function handleEditor(req, res) {
  const url = (req.url || '/').split('?')[0];
  if (url === '/__maliang-deck/editor' && req.method === 'GET') {
    sendJson(res, 200, {
      canPersist: true,
      revision: computeRevision(),
      sourceKind: 'json',
      sourcePath: DECK_PATH,
      mjsDivergenceWarning: false,
      warnings: [],
      supportedOps: ['reorderSlides', 'deleteSlide', 'updateElement'],
      supportedElementTypes: ['text', 'rect', 'image', 'line', 'circle'],
    });
    return true;
  }
  if (url === '/__maliang-deck/editor/save' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const deck = JSON.parse(fs.readFileSync(DECK_PATH, 'utf-8'));
      applyOps(deck, body.ops || []);
      const json = JSON.stringify(deck, null, 2) + '\\n';
      const tmp = DECK_PATH + '.tmp';
      fs.writeFileSync(tmp, json, 'utf-8');
      fs.renameSync(tmp, DECK_PATH);
      sendJson(res, 200, { ok: true, reload: true, revision: computeRevision(), warnings: [] });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: { code: 'patch-failed', message: e.message } });
    }
    return true;
  }
  return false;
}

function serveStatic(req, res) {
  const url = (req.url || '/').split('?')[0];
  let filePath = url === '/' ? '/index.html' : url;
  filePath = path.join(ROOT, filePath);
  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const handled = await handleEditor(req, res);
    if (!handled) serveStatic(req, res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log('maliang-deck editor server running at http://localhost:' + PORT);
  console.log('Open the URL above in your browser to present and edit.');
  console.log('Press Ctrl+C to stop.');
});
`;
}
