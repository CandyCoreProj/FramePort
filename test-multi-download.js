const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { app } = require('electron');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frameport-multi-'));
const output = path.join(root, 'output');
const clip1 = path.join(root, 'ClipOne.mp4');
const clip2 = path.join(root, 'ClipTwo.mp4');
const bin = path.join(process.env.APPDATA, 'FramePort', 'bin');
const ffmpeg = path.join(bin, 'ffmpeg.exe');

assert.ok(fs.existsSync(path.join(bin, 'yt-dlp.exe')) && fs.existsSync(ffmpeg), 'Install FramePort tools first');
fs.mkdirSync(output);
app.setPath('userData', path.join(root, 'appdata'));
fs.mkdirSync(path.join(root, 'appdata', 'bin'), { recursive: true });
fs.copyFileSync(path.join(bin, 'yt-dlp.exe'), path.join(root, 'appdata', 'bin', 'yt-dlp.exe'));
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;

for (const clip of [clip1, clip2]) {
  const generated = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
    'testsrc2=size=320x240:rate=30:duration=1', '-f', 'lavfi', '-i',
    'sine=frequency=440:sample_rate=44100:duration=1', '-c:v', 'libx264',
    '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', clip,
  ]);
  assert.equal(generated.status, 0, generated.stderr?.toString());
}

const server = http.createServer((request, response) => {
  const filePath = request.url === '/ClipOne.mp4' ? clip1 :
                   request.url === '/ClipTwo.mp4' ? clip2 : null;
  if (!filePath) {
    response.statusCode = 404;
    return response.end('Not found');
  }
  response.setHeader('Content-Type', 'video/mp4');
  response.setHeader('Content-Length', fs.statSync(filePath).size);
  fs.createReadStream(filePath).pipe(response);
});

const timeout = setTimeout(() => finish(1, 'Multi-download test timed out'), 60000);

function finish(code, error) {
  clearTimeout(timeout);
  if (error) console.error(error);
  server.close();
  try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  app.exit(code);
}

app.on('browser-window-created', (_event, win) => {
  win.show = () => {};
  win.webContents.once('did-finish-load', async () => {
    const port = server.address().port;
    const url1 = `http://127.0.0.1:${port}/ClipOne.mp4`;
    const url2 = `http://127.0.0.1:${port}/ClipTwo.mp4`;

    try {
      // 1. Test renderer parseUrls & UI
      const parseResult = await win.webContents.executeJavaScript(`(() => {
        const text = '${url1}\\n${url2}\\n${url1}\\nhttp://invalid-link.';
        const urls = parseUrls(text);
        setUrl(text);
        const countText = document.getElementById('urlCount').textContent;
        const countHidden = document.getElementById('urlCount').classList.contains('hidden');
        const goText = document.getElementById('goText').textContent;
        return { urls, countText, countHidden, goText };
      })()`);

      assert.deepEqual(parseResult.urls, [url1, url2, 'http://invalid-link']);
      assert.equal(parseResult.countHidden, false);
      assert.ok(parseResult.countText.includes('3'), 'Should count 3 unique links');
      assert.ok(parseResult.goText.includes('3'), 'Button should display 3 items');

      // 2. Test downloading multiple URLs simultaneously
      const multiDownload = await win.webContents.executeJavaScript(`(() => {
        const progress = [];
        window.api.onProgress((event) => progress.push(event));
        return window.api.download({
          urls: ['${url1}', '${url2}'],
          kind: 'video', quality: 'best', playlist: false,
          encoder: 'auto', output: 'h264', folder: ${JSON.stringify(output)}, language: 'th'
        }).then((result) => ({ result, progress }));
      })()`);

      assert.equal(multiDownload.result.code, 0, JSON.stringify(multiDownload.result));
      assert.equal(multiDownload.result.files.length, 2, 'Should download and convert both files');
      assert.ok(fs.existsSync(multiDownload.result.files[0]), 'First file must exist');
      assert.ok(fs.existsSync(multiDownload.result.files[1]), 'Second file must exist');
      assert.ok(multiDownload.progress.some((e) => e.item === '1/2' || e.item === '2/2'), 'Progress should show item counter');

      console.log('Successfully downloaded multiple links simultaneously:', multiDownload.result.files);
      finish(0);
    } catch (error) {
      finish(1, error.stack || String(error));
    }
  });
});

server.listen(0, '127.0.0.1', () => require('./main'));
