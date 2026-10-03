// PO Token (proof of origin) สำหรับ YouTube โดยไม่ต้องเข้าสู่ระบบ
// yt-dlp ขอโทเค็นผ่านปลั๊กอิน bgutil-ytdlp-pot-provider (GPL-3.0, แนบมาใน vendor/ โดยไม่แก้ไข)
// ปลั๊กอินคุยกับ HTTP server ในไฟล์นี้ผ่าน 127.0.0.1 เท่านั้น ไม่ได้ลิงก์โค้ดเข้าด้วยกัน
// โทเค็นสร้างด้วย BotGuard ของ Google ที่รันใน Chromium ของ Electron เอง (หน้าต่างซ่อน)
// จึงไม่ต้องติดตั้ง Node, jsdom หรือ canvas เพิ่ม
const http = require('node:http');
const fs = require('node:fs');
const { BrowserWindow, session } = require('electron');

// server ต้องบอกเวอร์ชันเดียวกับปลั๊กอินที่แนบมา ไม่อย่างนั้นปลั๊กอินจะเตือนหรือปฏิเสธ
const PLUGIN_VERSION = '2.0.1';
// robots.txt อยู่บนโดเมน youtube.com แต่ไม่มี CSP จึงรัน BotGuard ได้โดยมี origin เป็น YouTube จริง
const PAGE_URL = 'https://www.youtube.com/robots.txt';
const PARTITION = 'persist:youtube-guest';
const TOKEN_TTL = 6 * 60 * 60 * 1000;

// Google ไม่ยอมรับ user agent ที่มีคำว่า Electron
function cleanSession(partition) {
  const ses = session.fromPartition(partition);
  ses.setUserAgent(ses.getUserAgent().replace(/ (Electron|FramePort|frameport)\/\S+/gi, ''));
  return ses;
}

// เขียนคุกกี้ youtube.com/google.com เป็นไฟล์ Netscape ให้ yt-dlp ใช้ผ่าน --cookies
async function writeCookieFile(ses, file, { requireLogin = false } = {}) {
  const cookies = (await ses.cookies.get({}))
    .filter((c) => /(^|\.)(youtube|google)\.com$/.test(c.domain.replace(/^\./, '')));
  if (requireLogin ? !cookies.some((c) => c.name === 'LOGIN_INFO') : !cookies.length) return false;
  const lines = cookies.map((c) => {
    const domain = c.hostOnly ? c.domain.replace(/^\./, '') : '.' + c.domain.replace(/^\./, '');
    return [domain, c.hostOnly ? 'FALSE' : 'TRUE', c.path || '/', c.secure ? 'TRUE' : 'FALSE',
      Math.floor(c.expirationDate || 0), c.name, c.value].join('\t');
  });
  await fs.promises.writeFile(file, ['# Netscape HTTP Cookie File', ...lines, ''].join('\n'));
  return true;
}

// คุกกี้ผู้เยี่ยมชม (ไม่ได้เข้าสู่ระบบ) ได้จากการเปิดหน้าแรก YouTube ในหน้าต่างซ่อน
async function writeGuestCookies(file) {
  const ses = cleanSession(PARTITION);
  const page = new BrowserWindow({ show: false, webPreferences: { session: ses, sandbox: true, contextIsolation: true } });
  try {
    await page.loadURL(PAGE_URL);
    await page.webContents.executeJavaScript("fetch('/', { credentials: 'include' }).then((r) => r.text()).then(() => true)");
  } finally {
    page.destroy();
  }
  return writeCookieFile(ses, file);
}

// รันในหน้า youtube.com: อ่าน challenge ของ BotGuard จากหน้าแรก แล้วสร้างตัว mint โทเค็น
// วิธีเรียก BotGuard, GenerateIT และ looseJson ดัดแปลงจาก bgutils-js
// (MIT, Copyright (c) 2024 LuanRT, ดู vendor/licenses/bgutils-js-MIT.txt)
async function createMinter() {
  const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
  const API_KEY = 'AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw';
  const looseJson = (text) => {
    let json = text.replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/'((?:[^'\\]|\\[\s\S])*)'/g, (_m, inner) => JSON.stringify(inner.replace(/\\'/g, '\'')))
      .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    const data = JSON.parse(json);
    for (const key in data) {
      if (typeof data[key] === 'string' && /^\s*[{[]/.test(data[key])) {
        try { data[key] = JSON.parse(data[key]); } catch {}
      }
    }
    return data;
  };
  const toBytes = (b64) => Uint8Array.from(atob(b64.replace(/[-_.]/g, (c) => ({ '-': '+', _: '/', '.': '=' })[c])),
    (c) => c.charCodeAt(0));
  const toWebsafe = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
  const timeout = (ms, what) => new Promise((_r, reject) => setTimeout(() => reject(new Error(`${what} timed out`)), ms));

  // หน้าแรกของ YouTube ฝัง challenge ไว้ใน window.ytAtN(...) และ BotGuard อ่าน yt.config_ ของหน้าเดียวกัน
  const html = await (await fetch('/', { credentials: 'include' })).text();
  const cfg = html.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/s);
  if (cfg) window.yt = { config_: JSON.parse(cfg[1]) };
  const att = html.match(/window\.ytAtN\(\s*({[\s\S]*?})\s*\)/);
  const challenge = att ? looseJson(att[1])?.R?.bgChallenge : null;
  if (!challenge?.program) throw new Error('Could not find a BotGuard challenge on the YouTube homepage');

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https:' + challenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the BotGuard interpreter'));
    document.documentElement.append(script);
  });
  const vm = window[challenge.globalName];
  if (!vm?.a) throw new Error('BotGuard is unavailable');
  const noop = () => {};
  const snapshot = await Promise.race([
    new Promise((resolve) => vm.a(challenge.program, (asyncSnapshot) => resolve(asyncSnapshot), true, undefined,
      noop, [[], []], undefined, false, [noop, noop, noop, noop, noop])),
    timeout(10000, 'BotGuard'),
  ]);
  const signals = [];
  const botguardResponse = await Promise.race([
    new Promise((resolve) => snapshot(resolve, [undefined, undefined, signals, undefined])),
    timeout(10000, 'BotGuard snapshot'),
  ]);
  const res = await fetch('https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/GenerateIT', {
    method: 'POST',
    headers: { 'content-type': 'application/json+protobuf', 'x-goog-api-key': API_KEY, 'x-user-agent': 'grpc-web-javascript/0.1' },
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  const [integrityToken, ttlSecs] = await res.json();
  if (!integrityToken) throw new Error('Google returned no integrity token');
  if (typeof signals[0] !== 'function') throw new Error('BotGuard returned no minter');
  const mint = await signals[0](toBytes(integrityToken));
  if (typeof mint !== 'function') throw new Error('BotGuard minter is invalid');
  window.__frameportMint = async (binding) => toWebsafe(await mint(new TextEncoder().encode(binding)));
  window.__frameportVisitor = window.yt?.config_?.VISITOR_DATA || '';
  return Date.now() + (ttlSecs || 3600) * 1000;
}

function createPotProvider() {
  const ses = () => cleanSession(PARTITION);
  let win = null;
  let expiry = 0;
  let creating = null;
  let server = null;
  const started = Date.now();

  const reset = () => {
    if (win && !win.isDestroyed()) win.destroy();
    win = null;
    expiry = 0;
  };

  async function ensureMinter(force = false) {
    if (!force && win && !win.isDestroyed() && expiry > Date.now() + 60_000) return;
    creating ??= (async () => {
      reset();
      win = new BrowserWindow({
        show: false,
        webPreferences: { session: ses(), sandbox: true, contextIsolation: true, backgroundThrottling: false },
      });
      win.webContents.on('render-process-gone', reset);
      await win.loadURL(PAGE_URL);
      expiry = await win.webContents.executeJavaScript(`(${createMinter})()`);
    })().catch((error) => { reset(); throw error; }).finally(() => { creating = null; });
    await creating;
  }

  async function mint(binding, bypassCache) {
    await ensureMinter(bypassCache);
    const call = () => win.webContents.executeJavaScript(`window.__frameportMint(${JSON.stringify(binding)})`);
    try {
      return await call();
    } catch {
      await ensureMinter(true);
      return await call();
    }
  }

  async function handle(req, res) {
    const reply = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    // กันเว็บในเบราว์เซอร์ยิงมาที่ server ในเครื่อง
    if (req.headers.origin || req.headers['sec-fetch-site']) return reply(403, { error: 'Browser-originated requests are not allowed' });
    if (req.method === 'GET' && req.url === '/ping') {
      return reply(200, { version: PLUGIN_VERSION, server_uptime: (Date.now() - started) / 1000 });
    }
    if (req.method === 'POST' && (req.url === '/invalidate_caches' || req.url === '/invalidate_it')) {
      expiry = 0;
      return reply(204);
    }
    if (req.method !== 'POST' || req.url !== '/get_pot') return reply(404, { error: 'Not found' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw || '{}');
      await ensureMinter(!!body.bypass_cache);
      const contentBinding = body.content_binding ||
        await win.webContents.executeJavaScript('window.__frameportVisitor');
      if (!contentBinding) throw new Error('No content binding');
      const poToken = await mint(contentBinding, false);
      reply(200, { poToken, contentBinding, expiresAt: new Date(Date.now() + TOKEN_TTL) });
    } catch (error) {
      reply(500, { error: String(error?.message || error) });
    }
  }

  return {
    // คืน base_url ของ server (เปิดเฉพาะ 127.0.0.1 พอร์ตสุ่ม) หน้าต่าง BotGuard จะเปิดเมื่อ yt-dlp ขอโทเค็นครั้งแรก
    async baseUrl() {
      if (!server) {
        server = http.createServer((req, res) => { handle(req, res).catch(() => res.destroy()); });
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(0, '127.0.0.1', resolve);
        });
      }
      return `http://127.0.0.1:${server.address().port}`;
    },
    close() {
      reset();
      server?.close();
    },
  };
}

module.exports = { createPotProvider, writeCookieFile, writeGuestCookies, cleanSession };
