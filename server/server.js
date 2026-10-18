'use strict';
/* ============================================================
   AGENT PARTNERS - 静的サイト配信 + チャット入力ログ簡易DBサーバー
   - 依存ライブラリなし（Node 標準モジュールのみ）
   - DB実体は data/chat-logs.ndjson（1行=1レコードのNDJSON / 追記型の簡易DB）
   - 起動:  node server.js   /   npm start
   - 環境変数:
       PORT         … 待受ポート（既定 3000）
       ADMIN_TOKEN  … 設定するとログ取得(GET)/消去(DELETE)に x-admin-token ヘッダ必須
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');                 // html/ をドキュメントルートに
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'chat-logs.ndjson');    // ← 簡易データベース（ローカルファイル）
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const MAX_BODY = 1 * 1024 * 1024;                           // 1MB 上限

// データ領域を用意（初回起動時に自動生成）
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function send(res, status, body, headers) {
  res.writeHead(status, headers || {});
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > MAX_BODY) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** 入力レコードを検証・正規化（外部入力は信頼しない） */
function normalizeEntry(o) {
  if (!o || typeof o !== 'object') return null;
  const q = typeof o.q === 'string' ? o.q.slice(0, 1000) : '';
  if (!q.trim()) return null;
  return {
    t: typeof o.t === 'string' ? o.t.slice(0, 40) : new Date().toISOString(),
    page: typeof o.page === 'string' ? o.page.slice(0, 120) : '',
    q: q,
    source: typeof o.source === 'string' ? o.source.slice(0, 40) : 'input',
    matched: !!o.matched,
    id: o.id == null ? null : String(o.id).slice(0, 80),
    score: typeof o.score === 'number' ? o.score : null,
  };
}

/** NDJSON 全件読み込み（壊れた行はスキップ） */
function readAll() {
  let txt = '';
  try { txt = fs.readFileSync(DB_FILE, 'utf8'); } catch (_) { return []; }
  const out = [];
  txt.split(/\r?\n/).forEach((line) => {
    const s = line.trim();
    if (!s) return;
    try { out.push(JSON.parse(s)); } catch (_) { /* 壊れた行は無視 */ }
  });
  return out;
}

function authOk(req) {
  if (!ADMIN_TOKEN) return true;
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

const server = http.createServer(async (req, res) => {
  let pathname = '/';
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { return send(res, 400, 'Bad Request'); }

  /* ---------- API: ログ追記 ---------- */
  if (pathname === '/api/chat-log' && req.method === 'POST') {
    let body;
    try { body = await readBody(req); } catch (_) { return sendJson(res, 413, { ok: false, error: 'payload too large' }); }
    let obj;
    try { obj = JSON.parse(body); } catch (_) { return sendJson(res, 400, { ok: false, error: 'invalid json' }); }
    const entry = normalizeEntry(obj);
    if (!entry) return sendJson(res, 400, { ok: false, error: 'invalid entry' });
    try { fs.appendFileSync(DB_FILE, JSON.stringify(entry) + '\n'); }
    catch (_) { return sendJson(res, 500, { ok: false, error: 'write failed' }); }
    return sendJson(res, 200, { ok: true });
  }

  /* ---------- API: ログ全件取得 ---------- */
  if (pathname === '/api/chat-logs' && req.method === 'GET') {
    if (!authOk(req)) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return sendJson(res, 200, { ok: true, data: readAll() });
  }

  /* ---------- API: ログ全消去 ---------- */
  if (pathname === '/api/chat-logs' && req.method === 'DELETE') {
    if (!authOk(req)) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
    try { fs.writeFileSync(DB_FILE, ''); }
    catch (_) { return sendJson(res, 500, { ok: false, error: 'clear failed' }); }
    return sendJson(res, 200, { ok: true });
  }

  /* ---------- 静的配信 ---------- */
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  // サーバー資産・DB の露出を遮断
  if (pathname === '/server' || pathname.indexOf('/server/') === 0) return send(res, 403, 'Forbidden');

  const rel = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, '.' + rel);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden'); // パストラバーサル防御

  fs.readFile(filePath, (err, buf) => {
    if (err) return send(res, 404, 'Not Found');
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, buf, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });
});

server.listen(PORT, () => {
  process.stdout.write(
    'AGENT PARTNERS server running\n' +
    '  Site : http://localhost:' + PORT + '/\n' +
    '  Admin: http://localhost:' + PORT + '/admin.html\n' +
    '  DB   : ' + DB_FILE + '\n'
  );
});
