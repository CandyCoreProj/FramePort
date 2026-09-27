const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { app } = require('electron');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frameport-quality-'));
const output = path.join(root, 'output');
const audioOutput = path.join(root, 'audio');
const source = path.join(root, 'Clip.mp4');
const bin = path.join(process.env.APPDATA, 'FramePort', 'bin');
const ffmpeg = path.join(bin, 'ffmpeg.exe');
const ffprobe = path.join(bin, 'ffprobe.exe');
assert.ok(fs.existsSync(path.join(bin, 'yt-dlp.exe')) && fs.existsSync(ffmpeg), 'Install FramePort tools first');
fs.mkdirSync(output);
fs.mkdirSync(audioOutput);
app.setPath('userData', path.join(root, 'appdata'));
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;

const generated = spawnSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
  'testsrc2=size=320x240:rate=30:duration=1', '-f', 'lavfi', '-i',
  'sine=frequency=440:sample_rate=44100:duration=1', '-c:v', 'libx264',
  '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k', '-shortest', source,
]);
assert.equal(generated.status, 0, generated.stderr?.toString());

const server = http.createServer((_request, response) => {
  response.setHeader('Content-Type', 'video/mp4');
  response.setHeader('Content-Length', fs.statSync(source).size);
  fs.createReadStream(source).pipe(response);
});
const timeout = setTimeout(() => finish(1, 'Download test timed out'), 60000);

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
    const options = {
      url: `http://127.0.0.1:${server.address().port}/Clip.mp4`,
      kind: 'video', quality: 'best', playlist: false,
      encoder: 'auto', output: 'h264', folder: output, language: 'en',
    };
    try {
      const first = await win.webContents.executeJavaScript(`(() => {
        const progress = [];
        window.api.onProgress((event) => progress.push(event));
        return window.api.download(${JSON.stringify(options)}).then((result) => ({ result, progress }));
      })()`);
      assert.equal(first.result.code, 0, JSON.stringify(first.result));
      assert.ok(first.progress.some((event) => event.label?.includes('Converting to H.264')),
        'H.264 output must actually encode video');
      assert.ok(fs.existsSync(first.result.files[0]), 'Reported output file must exist');
      const sourceBytes = fs.statSync(source).size;
      const outputBytes = fs.statSync(first.result.files[0]).size;
      assert.ok(outputBytes > sourceBytes, `High-quality output should exceed this source: ${sourceBytes} → ${outputBytes}`);
      const second = await win.webContents.executeJavaScript(`window.api.download(${JSON.stringify(options)})`);
      assert.equal(second.code, 0, JSON.stringify(second));
      assert.equal(path.basename(second.files[0]), 'Clip 2.mp4');
      assert.ok(fs.existsSync(second.files[0]), 'Second output file must exist');
      const hevc = await win.webContents.executeJavaScript(`window.api.download(${JSON.stringify({ ...options, output: 'hevc' })})`);
      assert.equal(hevc.code, 0, JSON.stringify(hevc));
      assert.equal(path.basename(hevc.files[0]), 'Clip 3.mp4');
      const info = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1:nokey=1', hevc.files[0]],
      { encoding: 'utf8' });
      assert.equal(info.stdout.trim(), 'hevc');
      const original = await win.webContents.executeJavaScript(`window.api.download(${JSON.stringify({ ...options, output: 'original' })})`);
      assert.equal(original.code, 0, JSON.stringify(original));
      assert.equal(path.basename(original.files[0]), 'Clip 4.mp4');
      const audioOnly = await win.webContents.executeJavaScript(`window.api.download(${JSON.stringify({ ...options, kind: 'audio', quality: 'mp3', folder: audioOutput })})`);
      assert.equal(audioOnly.code, 0, JSON.stringify(audioOnly));
      assert.equal(path.basename(audioOnly.files[0]), 'Clip.mp3');
      assert.deepEqual(fs.readdirSync(output).sort(), ['Clip.mp4', 'Clip 2.mp4', 'Clip 3.mp4', 'Clip 4.mp4'].sort());
      assert.deepEqual(fs.readdirSync(audioOutput), ['Clip.mp3']);
      console.log(`Converted H.264 ${sourceBytes} → ${outputBytes} bytes; numbered H.265/original copies and extracted MP3`);
      finish(0);
    } catch (error) {
      finish(1, error.stack || String(error));
    }
  });
});

server.listen(0, '127.0.0.1', () => require('./main'));
