const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const WIN = process.platform === 'win32';
const EXE = WIN ? '.exe' : '';
const binDir = () => path.join(app.getPath('userData'), 'bin');
const local = (name) => path.join(binDir(), name + EXE);

const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${EXE}`;
// ffmpeg ที่ทีม yt-dlp build ไว้ใช้กับ yt-dlp โดยเฉพาะ
const FFMPEG_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

let win;
let proc = null;
let cancelled = false;

const runs = (cmd, args = ['-version']) => new Promise((resolve) => {
  const child = spawn(cmd, args, { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => resolve(false));
  child.on('close', (code) => resolve(code === 0));
});

const capture = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `${cmd} exited ${code}`)));
});

// หา yt-dlp: ในโฟลเดอร์ของโปรแกรม -> ใน PATH
async function findYtdlp() {
  if (fs.existsSync(local('yt-dlp'))) return local('yt-dlp');
  return await runs('yt-dlp', ['--version']) ? 'yt-dlp' : null;
}

// คืนค่า: 'local' = อยู่ในโฟลเดอร์โปรแกรม, 'path' = อยู่ใน PATH, null = ไม่มี
async function findFfmpeg() {
  if (fs.existsSync(local('ffmpeg')) && fs.existsSync(local('ffprobe'))) return 'local';
  if ((await Promise.all([runs('ffmpeg'), runs('ffprobe')])).every(Boolean)) return 'path';
  return null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 820,
    height: 680,
    minWidth: 560,
    minHeight: 500,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#f4efe9',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', async () => {
  await killProc();
  app.quit();
});

// ดาวน์โหลดไฟล์แบบมี % ส่งไปหน้าจอ
async function fetchTo(url, dest, tag, language = 'th') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(say(language, `ดาวน์โหลดไม่สำเร็จ (${res.status})`, `Download failed (${res.status})`));
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(dest);
  let got = 0;
  let lastProgress = 0;
  for await (const chunk of res.body) {
    got += chunk.length;
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    if (total && (Date.now() - lastProgress > 100 || got >= total)) {
      lastProgress = Date.now();
      win.webContents.send('install-progress', { tag, pct: (got / total) * 100 });
    }
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
}

ipcMain.handle('status', async () => {
  const [version, ffmpeg] = await Promise.all([
    capture(fs.existsSync(local('yt-dlp')) ? local('yt-dlp') : 'yt-dlp', ['--version'])
      .then((output) => output.trim()).catch(() => null),
    findFfmpeg(),
  ]);
  return { version, ffmpeg: !!ffmpeg, canInstallFfmpeg: WIN, downloads: app.getPath('downloads') };
});

ipcMain.handle('install-ytdlp', async (_e, language = 'th') => {
  fs.mkdirSync(binDir(), { recursive: true });
  const tmp = local('yt-dlp') + '.part';
  await fetchTo(YTDLP_URL, tmp, 'ytdlp', language);
  fs.renameSync(tmp, local('yt-dlp'));
  if (!WIN) fs.chmodSync(local('yt-dlp'), 0o755);
  return true;
});

ipcMain.handle('install-ffmpeg', async (_e, language = 'th') => {
  if (!WIN) throw new Error(say(language,
    'ติดตั้งอัตโนมัติได้เฉพาะ Windows — กรุณาติดตั้ง ffmpeg เอง',
    'Automatic installation is available on Windows only. Please install FFmpeg manually.'));
  fs.mkdirSync(binDir(), { recursive: true });
  const zip = path.join(binDir(), 'ffmpeg.zip');
  const tmpDir = path.join(binDir(), 'ffmpeg-tmp');
  try {
    await fetchTo(FFMPEG_URL, zip, 'ffmpeg', language);
    win.webContents.send('install-progress', { tag: 'ffmpeg', pct: 100, extracting: true });
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    await fs.promises.mkdir(tmpDir);
    // tar ของ Windows แตกไฟล์ zip ได้
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    await capture(tar, ['-xf', zip, '-C', tmpDir]);
    const inner = (await fs.promises.readdir(tmpDir))[0];
    await Promise.all(['ffmpeg', 'ffprobe'].map((name) =>
      fs.promises.copyFile(path.join(tmpDir, inner, 'bin', name + EXE), local(name))));
  } finally {
    await fs.promises.rm(zip, { force: true });
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
  return true;
});

ipcMain.handle('update-ytdlp', async () => {
  const bin = await findYtdlp();
  if (!bin) throw new Error('ยังไม่มี yt-dlp');
  return (await capture(bin, ['-U'])).trim();
});

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('open-folder', (_e, dir) => shell.openPath(dir));

// ---------- แปลงวิดีโอให้เข้าโปรแกรมตัดต่อ (H.264 + AAC) ----------

const ffBin = (name, ff) => (ff === 'local' ? local(name) : name);
const say = (language, thai, english) => language === 'en' ? english : thai;
const compatibleVideo = (stream) => stream.codec_name === 'h264' &&
  (stream.pix_fmt === 'yuv420p' || stream.pix_fmt === 'yuvj420p');

const ENCODERS = [
  {
    id: 'nvenc', codec: 'h264_nvenc', name: 'NVIDIA NVENC', decode: 'cuda', format: 'yuv420p',
    args: ['-preset', 'p3', '-rc', 'vbr', '-cq', '19', '-b:v', '0'],
  },
  {
    id: 'qsv', codec: 'h264_qsv', name: 'Intel Quick Sync', decode: 'qsv', format: 'nv12',
    args: ['-preset', 'veryfast', '-async_depth', '8', '-global_quality', '20'],
  },
  {
    id: 'amf', codec: 'h264_amf', name: 'AMD AMF', decode: 'd3d11va', format: 'yuv420p',
    args: ['-quality', 'balanced', '-rc', 'cqp', '-qp_i', '18', '-qp_p', '20', '-qp_b', '22'],
  },
];
const X264 = {
  id: 'cpu', codec: 'libx264', name: 'CPU x264', format: 'yuv420p',
  args: ['-preset', 'veryfast', '-crf', '18', '-threads', '0'],
};

// FFmpeg อาจมี encoder ในไบนารีแต่ไดรเวอร์หรืออุปกรณ์ใช้ไม่ได้: ทดสอบจริงก่อนเลือก
const encoderSupport = new Map();
let amfDecodeDevice;
async function supportsEncoder(enc, ff) {
  if (enc === X264) return true;
  const key = `${ffBin('ffmpeg', ff)}:${enc.id}`;
  if (!encoderSupport.has(key)) {
    encoderSupport.set(key, runs(ffBin('ffmpeg', ff), [
      '-hide_banner', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=30:d=0.3',
      '-c:v', enc.codec, ...enc.args, '-pix_fmt', enc.format, '-profile:v', 'high',
      '-f', 'null', '-',
    ]));
  }
  return encoderSupport.get(key);
}

function encoderOrder(choice) {
  if (choice === 'cpu') return [X264];
  const selected = ENCODERS.find((enc) => enc.id === choice);
  return selected ? [selected, X264] : [...ENCODERS, X264];
}

function decoderOptions(enc, choice) {
  if (!enc.decode || choice === 'hybrid') return [false];
  if (enc.id !== 'amf' || !WIN) return [true, false];
  const devices = [0, 1, 2, 3];
  if (amfDecodeDevice !== undefined) {
    devices.splice(devices.indexOf(amfDecodeDevice), 1);
    devices.unshift(amfDecodeDevice);
  }
  return [...devices.map((device) => ({ device })), false];
}

async function probe(file, ff) {
  const output = await capture(ffBin('ffprobe', ff), [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt:format=duration', '-of', 'json', file,
  ]);
  const j = JSON.parse(output || '{}');
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  const a = (j.streams || []).find((s) => s.codec_type === 'audio');
  return { v, a, duration: parseFloat(j.format?.duration) || 0 };
}

// รัน process แล้วรอจบ (ใช้ตัวแปร proc เดียวกันเพื่อให้ปุ่มยกเลิกใช้ได้)
function run(bin, args, onLine) {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });
    proc = child;
    const pending = { stdout: '', stderr: '' };
    for (const stream of ['stdout', 'stderr']) {
      child[stream].on('data', (buf) => {
        pending[stream] += buf.toString('utf8');
        const lines = pending[stream].split(/\r?\n/);
        pending[stream] = lines.pop();
        for (const line of lines) if (line.trim()) onLine(line);
      });
    }
    child.on('error', (error) => { onLine(error.message); resolve(1); });
    child.on('close', (code) => {
      for (const line of Object.values(pending)) if (line.trim()) onLine(line);
      if (proc === child) proc = null;
      resolve(code);
    });
  });
}

function encode(file, tmp, info, enc, ff, hardwareDecode = false, language = 'th') {
  const vCopy = compatibleVideo(info.v);
  const inputArgs = hardwareDecode ? [
    '-hwaccel', enc.decode,
    ...(typeof hardwareDecode.device === 'number' ? ['-hwaccel_device', String(hardwareDecode.device)] : []),
    '-hwaccel_output_format', enc.decode === 'd3d11va' ? 'd3d11' : enc.decode,
  ] : [];
  const args = [
    '-hide_banner', '-v', 'error', '-y', '-progress', 'pipe:1', '-nostats',
    ...inputArgs, '-i', file, '-map', '0:v:0', '-map', '0:a:0?',
    ...(vCopy ? ['-c:v', 'copy'] : [
      '-c:v', enc.codec, ...enc.args,
      ...(hardwareDecode ? [] : ['-pix_fmt', enc.format]),
      '-profile:v', 'high',
    ]),
    ...(info.a?.codec_name === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '320k']),
    '-movflags', '+faststart', tmp,
  ];
  const decodeLabel = hardwareDecode ? say(language, ' + ถอดรหัสด้วย GPU', ' + GPU decode') : '';
  const label = vCopy
    ? say(language, 'กำลังแปลงเสียงเป็น AAC', 'Converting audio to AAC')
    : say(language, `กำลังแปลง H.264 (${enc.name}${decodeLabel})`, `Converting to H.264 (${enc.name}${decodeLabel})`);
  win.webContents.send('progress', { pct: 0, label });
  const started = Date.now();
  let speed = '';
  let lastProgress = 0;
  return run(ffBin('ffmpeg', ff), args, (line) => {
    const [k, v] = line.split('=');
    if (k === 'speed') speed = v.trim();
    else if (k === 'out_time_us' && info.duration) {
      const pct = Math.min(100, (Number(v) / 1e6 / info.duration) * 100);
      const secs = pct > 0 ? ((Date.now() - started) / 1000) * (100 / pct - 1) : 0;
      const eta = pct > 1 ? new Date(secs * 1000).toISOString().slice(11, 19).replace(/^00:/, '') : '';
      if (Date.now() - lastProgress > 120 || pct >= 100) {
        lastProgress = Date.now();
        win.webContents.send('progress', { pct, speed: speed !== 'N/A' ? speed : '', eta, label });
      }
    } else if (!/^[a-z_0-9]+=/.test(line)) {
      win.webContents.send('log', line);
    }
  });
}

async function makeEditFriendly(file, ff, encoderChoice = 'auto', language = 'th') {
  win.webContents.send('progress', { pct: 0, label: say(language, 'กำลังตรวจสอบไฟล์', 'Checking file') });
  const info = await probe(file, ff);
  if (cancelled) return -1;
  if (!info.v) return 0;
  const vOk = compatibleVideo(info.v);
  const aOk = !info.a || info.a.codec_name === 'aac';
  if (vOk && aOk) return 0;

  win.webContents.send('log', say(language,
    `แปลงไฟล์: ${info.v.codec_name}/${info.a?.codec_name ?? '-'} → h264/aac`,
    `Converting ${info.v.codec_name}/${info.a?.codec_name ?? '-'} to H.264/AAC`));
  const tmp = file.replace(/\.mp4$/i, '') + '.editing.mp4';
  let code = 1;
  if (vOk) {
    code = await encode(file, tmp, info, X264, ff, false, language);
  } else {
    for (const enc of encoderOrder(encoderChoice)) {
      if (cancelled) break;
      if (!await supportsEncoder(enc, ff)) {
        win.webContents.send('log', say(language, `${enc.name} ใช้ไม่ได้บนเครื่องนี้`, `${enc.name} is unavailable`));
        continue;
      }
      for (const hardwareDecode of decoderOptions(enc, encoderChoice)) {
        if (cancelled) break;
        code = await encode(file, tmp, info, enc, ff, hardwareDecode, language);
        if (code === 0) {
          if (enc.id === 'amf' && hardwareDecode) amfDecodeDevice = hardwareDecode.device;
          break;
        }
        const method = hardwareDecode ? say(language, ' ถอดรหัสด้วย GPU', ' with GPU decode') : '';
        win.webContents.send('log', say(language,
          `${enc.name}${method} ไม่สำเร็จ กำลังลองวิธีถัดไป`,
          `${enc.name}${method} failed; trying the next option`));
      }
      if (code === 0) break;
    }
  }
  if (code === 0 && !cancelled) {
    fs.rmSync(file);
    fs.renameSync(tmp, file);
    return 0;
  }
  fs.rmSync(tmp, { force: true });
  return code || 1;
}

// kind: 'video' | 'audio'
// quality (video): 'best' | '2160' | '1440' | '1080' | '720' | '480'
// quality (audio): 'mp3' | 'wav' | 'flac'
ipcMain.handle('download', async (_e, { url, kind, quality, folder, playlist, encoder, language = 'th' }) => {
  if (proc) throw new Error(say(language, 'มีงานดาวน์โหลดกำลังทำงานอยู่', 'A download is already running'));
  const [bin, ff] = await Promise.all([findYtdlp(), findFfmpeg()]);
  if (!bin) throw new Error(say(language, 'ยังไม่มี yt-dlp', 'yt-dlp is not installed'));
  if (!ff) throw new Error(say(language, 'ยังไม่มี ffmpeg', 'FFmpeg is not installed'));
  cancelled = false;

  // yt-dlp จะเขียนชื่อไฟล์ที่โหลดเสร็จลงไฟล์นี้ เพื่อเอาไปแปลงต่อ
  const listFile = path.join(app.getPath('temp'), `ytdlp-gui-${Date.now()}.txt`);

  const args = [
    url,
    '-P', folder,
    '-o', '%(title)s.%(ext)s',
    '--no-overwrites',
    '--newline',
    '--concurrent-fragments', '8',
    '--buffer-size', '16K',
    '--progress-template', 'download:[P]%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    playlist ? '--yes-playlist' : '--no-playlist',
  ];
  if (ff === 'local') args.push('--ffmpeg-location', binDir());

  if (kind === 'audio') {
    args.push('-f', 'ba/b', '-x', '--audio-format', quality, '--audio-quality', '0');
  } else {
    // เรียงตาม: ความละเอียด (ไม่เกินที่เลือก) > fps > ไม่เอา HDR > ชอบ H.264/AAC
    // ความละเอียดที่ไม่มี H.264 (4K/2K บน YouTube) จะแปลงเป็น H.264 หลังโหลดเสร็จ
    const res = quality === 'best' ? 'res' : `res:${quality}`;
    args.push(
      '-f', 'bv*+ba/b',
      '-S', `${res},fps,hdr:sdr,vcodec:h264,acodec:aac`,
      '--merge-output-format', 'mp4',
      '--remux-video', 'mp4',
      '--print-to-file', 'after_move:filepath', listFile,
    );
  }

  const label = say(language, 'กำลังดาวน์โหลด', 'Downloading');
  let lastProgress = 0;
  let code = await run(bin, args, (line) => {
    if (line.startsWith('[P]')) {
      const [pct, speed, eta] = line.slice(3).split('|').map((s) => s.trim());
      const value = parseFloat(pct) || 0;
      if (Date.now() - lastProgress > 120 || value >= 100) {
        lastProgress = Date.now();
        win.webContents.send('progress', { pct: value, speed, eta, label });
      }
    } else {
      win.webContents.send('log', line);
    }
  });

  if (kind === 'video' && fs.existsSync(listFile)) {
    const files = [...new Set(fs.readFileSync(listFile, 'utf8').split(/\r?\n/).filter(Boolean))];
    fs.rmSync(listFile, { force: true });
    for (const f of files) {
      if (cancelled) break;
      if (!fs.existsSync(f)) continue;
      const c = await makeEditFriendly(f, ff, encoder, language);
      if (c !== 0) code = c;
    }
  }
  return cancelled ? -1 : code;
});

// yt-dlp.exe มี process ลูก ต้องฆ่าทั้งต้นไม้
async function killProc() {
  cancelled = true;
  if (!proc) return;
  if (WIN) await runs('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
  else proc.kill();
}

ipcMain.handle('cancel', killProc);
