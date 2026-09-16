#!/usr/bin/env node
/* pachiverse.com 開発用サーバー — 静的配信 + Tweaks Studio 用の中継 API（開発時専用・依存パッケージなし）
   使い方: node scripts/tweaks-dev-server.mjs [port]   （既定 8790。0.0.0.0 で待ち受けるので同一 LAN の iPhone からも開ける）
   - リポジトリ直下を静的配信する（拡張子なし URL は .html を補う。動画は Range 対応。キャッシュなし）
   - .html には受信ランタイム（scripts/tweaks-runtime.js）の script タグを注入する
   - GET/POST/OPTIONS /api/dev/tweaks: Tweaks Studio の契約 { app, version, values, schema, defaults }。値はメモリ保持のみ
   - defaults は index.html の window.PV_TWEAKS（数値台帳）から読む。台帳が正で、確定値はそこへ焼き込む
   本番（Vercel）にはこのサーバーもランタイムも存在しない（HTML が参照していない） */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8790);
const RUNTIME_PATH = '/__tweaks/runtime.js';
const APP_NAME = 'pachiverse.com';

// Studio のスライダー定義。key は index.html の window.PV_TWEAKS 内のドット区切りパス
const SCHEMA = [
  {
    title: '星空（ページ全体の背景）',
    desc: 'トップページ全体の背景に流れる星。canvas 1 枚で描画（2026-09-16 の iOS 対策後の実装）',
    params: [
      { key: 'stars.on', label: '星を描く', min: 0, max: 1, step: 1, desc: '0 で星空を消す（星雲・流れ星・動画は残る）。負荷比較用' },
      { key: 'stars.dprMax', label: '解像度上限（DPR）', min: 1, max: 3, step: 0.5, desc: '描画解像度の上限。3 で iPhone の等倍まで鮮明、下げるほど GPU メモリが減る' },
      { key: 'stars.fps', label: '描画フレームレート', min: 5, max: 60, step: 5, desc: '1 秒あたりの再描画回数。下げると動きが粗くなるぶん省電力' },
      { key: 'stars.drift', label: '流れる速さ', min: 0, max: 4, step: 0.25, desc: '星が横に流れる速さの倍率。0 で停止' },
      { key: 'stars.twinkle', label: '明滅の強さ', min: 0, max: 2, step: 0.1, desc: '手前 2 層の明滅（明るさの往復）の振れ幅。0 で一定' },
      { key: 'stars.parallax', label: 'スクロール視差', min: 0, max: 3, step: 0.25, desc: 'スクロールに合わせて星が上へ流れる量の倍率。0 で固定' },
      { key: 'stars.size', label: '星の大きさ', min: 0.5, max: 3, step: 0.25, desc: '点の直径の倍率' },
      { key: 'stars.alpha', label: '星の明るさ', min: 0, max: 1.5, step: 0.05, desc: '全層の不透明度の倍率' },
      { key: 'stars.back', label: '奥の層', min: 0, max: 1, step: 1, desc: '奥の層（小さく遅い星 8 個/タイル）を描くか' },
      { key: 'stars.mid', label: '中間の層', min: 0, max: 1, step: 1, desc: '中間の層（明滅する 5 個/タイル）を描くか' },
      { key: 'stars.front', label: '手前の層', min: 0, max: 1, step: 1, desc: '手前の層（大きめで逆方向に流れる 4 個/タイル）を描くか' },
    ],
  },
  {
    title: 'ヒーロー（最上部）',
    desc: '最上部の背景動画と、スクロール時に筐体・見出し・ボタンがずれる量',
    params: [
      { key: 'hero.videoOn', label: '背景動画', min: 0, max: 1, step: 1, desc: '0 で背景動画を止めて隠す（負荷比較用）' },
      { key: 'hero.parallaxMul', label: '視差の量', min: 0, max: 2, step: 0.1, desc: 'スクロールで筐体・見出し・ボタンが動く量の倍率。0 で固定' },
    ],
  },
  {
    title: '本文セクション（トップ下部）',
    desc: 'スクロールで現れるカード・見出しの動きと、ガラスカードのノイズ',
    params: [
      { key: 'sections.parallaxMul', label: '出現時のずれ量', min: 0, max: 4, step: 0.25, desc: 'カードや見出しがスクロールに合わせて上下にずれる量の倍率' },
      { key: 'sections.noiseStrength', label: 'ノイズの強さ', min: 0, max: 1, step: 0.05, desc: 'ガラスカードが出入りするときに乗る砂ノイズの濃さ' },
    ],
  },
  {
    title: '画面効果（走査線・ビネット・色収差）',
    desc: '画面全体に重ねる CRT 風の効果',
    params: [
      { key: 'fx.scanline', label: '走査線', min: 0, max: 1, step: 0.05, desc: '横縞の濃さ。0 で消える' },
      { key: 'fx.vignette', label: 'ビネット', min: 0, max: 1, step: 0.05, desc: '四隅の暗さと上下のネオン光の濃さ' },
      { key: 'fx.chroma', label: '見出しの色収差', min: 0, max: 1, step: 0.05, desc: '「Spin the Verse.」の青/マゼンタのずれの濃さ' },
    ],
  },
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// index.html の台帳（JS オブジェクトリテラル）を読む。台帳の形が変わったらここも合わせる
function readDefaults() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/window\.PV_TWEAKS = (\{[\s\S]*?\n  \});/);
  if (!m) throw new Error('index.html に window.PV_TWEAKS の台帳が見つかりません');
  return new Function('return (' + m[1] + ');')();
}
function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}
function validateSchema(defaults) {
  const missing = SCHEMA.flatMap((g) => g.params.map((p) => p.key)).filter((k) => typeof getPath(defaults, k) !== 'number');
  if (missing.length) throw new Error('台帳に無い（または数値でない）スキーマ項目: ' + missing.join(', '));
}

let store = null; // { version, values }

function sendJson(res, status, body, extra = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS, ...extra });
  res.end(data);
}

function handleApi(req, res) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method === 'GET') {
    let defaults;
    try { defaults = readDefaults(); validateSchema(defaults); }
    catch (err) { sendJson(res, 500, { error: String(err.message || err) }); return; }
    sendJson(res, 200, { app: APP_NAME, version: store ? store.version : 0, values: store ? store.values : null, schema: SCHEMA, defaults });
    return;
  }
  if (req.method === 'POST') {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 1e6) { req.destroy(); } });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); }
      catch (err) { sendJson(res, 400, { error: 'invalid json', detail: String(err.message || err) }); return; }
      if (body === null || typeof body !== 'object' || Array.isArray(body)) { sendJson(res, 400, { error: 'expected object' }); return; }
      store = { version: Date.now(), values: body }; // Date.now を版にして、再起動後も単調増加を保つ
      sendJson(res, 200, { version: store.version });
    });
    return;
  }
  sendJson(res, 405, { error: 'method not allowed' });
}

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  if (decoded.includes('..') || decoded.includes('\0')) return null;
  let rel = decoded === '/' ? '/index.html' : decoded;
  let abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT)) return null;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
  if (!path.extname(rel) && fs.existsSync(abs + '.html')) return abs + '.html';
  return null;
}

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  if (ext === '.html') {
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('</body>', '<script src="' + RUNTIME_PATH + '"></script>\n</body>');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(html);
    return;
  }
  const size = fs.statSync(filePath).size;
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); res.end(); return; }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || '/';
  try {
    if (urlPath.startsWith('/api/dev/tweaks')) { handleApi(req, res); return; }
    if (urlPath.split('?')[0] === RUNTIME_PATH) {
      res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(path.join(ROOT, 'scripts', 'tweaks-runtime.js'), 'utf8'));
      return;
    }
    const filePath = resolveFile(urlPath);
    if (!filePath) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found: ' + urlPath); return; }
    serveFile(req, res, filePath);
  } catch (err) {
    console.error('[tweaks-dev-server]', urlPath, err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('server error: ' + String(err.message || err));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  try { validateSchema(readDefaults()); } catch (err) { console.error('[tweaks-dev-server] 台帳エラー:', err.message); process.exit(1); }
  const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('[tweaks-dev-server] serving ' + ROOT);
  console.log('  PC:      http://localhost:' + PORT + '/');
  for (const ip of lan) console.log('  iPhone:  http://' + ip + ':' + PORT + '/   （同一 LAN）');
  console.log('  Studio:  接続先 URL に http://localhost:' + PORT + ' を入力');
});
