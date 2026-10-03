// Optional live integration test: YouTube + bundled plugin + Electron BotGuard.
// Uses an isolated guest session; never reads the user's sign-in cookies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { app, BrowserWindow } = require('electron');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frameport-youtube-'));
const bin = path.join(process.env.APPDATA, 'FramePort', 'bin');
app.setPath('userData', path.join(root, 'appdata'));
fs.mkdirSync(path.join(root, 'appdata', 'bin'), { recursive: true });
fs.copyFileSync(path.join(bin, 'yt-dlp.exe'), path.join(root, 'appdata', 'bin', 'yt-dlp.exe'));
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;

let tokenRequests = 0;
const children = new Set();
const spawn = childProcess.spawn;
childProcess.spawn = (command, args, options) => {
  if (path.basename(command) === 'yt-dlp.exe' && args.includes('--')) {
    // mweb media requires PO Tokens. Default clients can succeed without them.
    args = ['--verbose', '--extractor-args', 'youtube:player_client=mweb;fetch_pot=always', ...args];
  }
  const child = spawn(command, args, options);
  children.add(child);
  child.once('close', () => children.delete(child));
  return child;
};
// Count successfully served tokens, without printing their contents.
const http = require('node:http');
const createServer = http.createServer;
http.createServer = (handler) => createServer((req, res) => {
  if (req.url === '/get_pot') res.once('finish', () => {
    if (res.statusCode === 200) tokenRequests++;
  });
  handler(req, res);
});

const timer = setTimeout(() => finish(1, 'YouTube integration test timed out'), 150000);
let finishing = false;
function finish(code, error) {
  if (finishing) return;
  finishing = true;
  clearTimeout(timer);
  if (error) console.error(error);
  for (const child of children) child.kill();
  app.exit(code);
}
app.on('quit', () => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
});

let tested = false;
app.on('browser-window-created', (_event, win) => {
  win.show = () => {};
  if (tested) return;
  tested = true;
  win.webContents.once('did-finish-load', async () => {
    try {
      const options = {
        url: process.env.FRAMEPORT_TEST_YOUTUBE_URL || 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        kind: 'video', quality: '480', playlist: false,
        output: 'original', folder: path.join(root, 'output'), language: 'en',
      };
      const out = await win.webContents.executeJavaScript(`(() => {
        const logs = [];
        window.api.onLog((line) => logs.push(line));
        return window.api.download(${JSON.stringify(options)}).then((result) => ({ result, logs }));
      })()`);
      // Redact verbose yt-dlp config/cookies/tokens; print only diagnostic lines.
      for (const line of out.logs) {
        if (/^(ERROR:|WARNING:|\[youtube\]|\[debug\] \[youtube\])/.test(line)) {
          console.log(line.replace(/https?:\/\/\S+/g, '[URL]'));
        }
      }
      assert.equal(out.result.code, 0, JSON.stringify(out.result));
      assert.ok(out.result.files.length && fs.statSync(out.result.files[0]).size > 0, 'Download must produce media');
      assert.ok(tokenRequests > 0, 'Bundled plugin must request and receive a PO Token');
      assert.ok(BrowserWindow.getAllWindows().length > 1, 'BotGuard hidden window must exist before quit');
      console.log(`YouTube media downloaded; ${tokenRequests} successful PO Token request(s); closing main window`);
      clearTimeout(timer);
      // Exercise the real quit path with a hidden BotGuard window still alive.
      win.close();
    } catch (error) {
      finish(1, error.stack || String(error));
    }
  });
});

require('./main');
