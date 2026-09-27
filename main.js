const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const { spawn } = require('child_process');
const { randomBytes } = require('node:crypto');
const { StringDecoder } = require('node:string_decoder');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { updateYtdlp } = require('./ytdlp-updater');
const { reserveVersionedPath } = require('./download-path');
const { startAppUpdates } = require('./app-updater');

const WIN = process.platform === 'win32';
const EXE = WIN ? '.exe' : '';
const binDir = () => path.join(app.getPath('userData'), 'bin');
const local = (name) => path.join(binDir(), name + EXE);

const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${EXE}`;
// ffmpeg ที่ทีม yt-dlp build ไว้ใช้กับ yt-dlp โดยเฉพาะ
const FFMPEG_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

let win;
let busy = false;
let cancelled = false;
const procs = new Set();

const say = (language, thai, english) => language === 'en' ? english : thai;
const send = (channel, data) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
};

// ใช้ CPU/GPU เต็มที่แต่ลดลำดับความสำคัญ เพื่อให้เครื่องยังลื่นระหว่างแปลงไฟล์
// (บน Windows process ลูกของ yt-dlp เช่น ffmpeg ตอนรวมไฟล์ จะได้ลำดับนี้ไปด้วย)
function lowerPriority(child) {
  try { if (child.pid) os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
}

const runs = (cmd, args = ['-version']) => new Promise((resolve) => {
  const child = spawn(cmd, args.map(String), { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => resolve(false));
  child.on('close', (code) => resolve(code === 0));
});

const capture = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args.map(String), { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `${cmd} exited ${code}`)));
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
    width: 900,
    height: 780,
    minWidth: 600,
    minHeight: 560,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171412' : '#f6f3ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.once('ready-to-show', () => win.show());
  win.loadFile('index.html');
}

let appUpdates;
app.whenReady().then(() => {
  createWindow();
  appUpdates = startAppUpdates(send);
});

ipcMain.handle('app-update-state', () => appUpdates?.state() ?? null);
ipcMain.handle('install-app-update', () => appUpdates?.install() ?? 'unavailable');
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
  try {
    for await (const chunk of res.body) {
      got += chunk.length;
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
      if (total && (Date.now() - lastProgress > 100 || got >= total)) {
        lastProgress = Date.now();
        send('install-progress', { tag, pct: (got / total) * 100 });
      }
    }
  } finally {
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
  }
}

ipcMain.handle('status', async () => {
  const [version, ffmpeg] = await Promise.all([
    capture(fs.existsSync(local('yt-dlp')) ? local('yt-dlp') : 'yt-dlp', ['--version'])
      .then((output) => output.trim()).catch(() => null),
    findFfmpeg(),
  ]);
  return {
    version, ffmpeg: !!ffmpeg, canInstallFfmpeg: WIN,
    downloads: app.getPath('downloads'), appVersion: app.getVersion(),
  };
});

ipcMain.handle('install-ytdlp', async (_e, language = 'th') => {
  fs.mkdirSync(binDir(), { recursive: true });
  const tmp = local('yt-dlp') + '.part';
  try {
    await fetchTo(YTDLP_URL, tmp, 'ytdlp', language);
    fs.renameSync(tmp, local('yt-dlp'));
  } finally {
    fs.rmSync(tmp, { force: true });
  }
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
    send('install-progress', { tag: 'ffmpeg', pct: 100, extracting: true });
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    await fs.promises.mkdir(tmpDir);
    // tar ของ Windows แตกไฟล์ zip ได้ แตกเฉพาะ ffmpeg/ffprobe เพื่อให้เร็วขึ้น
    const tar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    await capture(tar, ['-xf', zip, '-C', tmpDir, '*/bin/ffmpeg.exe', '*/bin/ffprobe.exe'])
      .catch(() => capture(tar, ['-xf', zip, '-C', tmpDir]));
    const inner = (await fs.promises.readdir(tmpDir))[0];
    await Promise.all(['ffmpeg', 'ffprobe'].map((name) =>
      fs.promises.copyFile(path.join(tmpDir, inner, 'bin', name + EXE), local(name))));
    encoderSupport.clear();
  } finally {
    await fs.promises.rm(zip, { force: true });
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
  return true;
});

ipcMain.handle('update-ytdlp', async (_e, language = 'th') => {
  const bin = await findYtdlp();
  if (!bin) throw new Error(say(language, 'ยังไม่มี yt-dlp', 'yt-dlp is not installed'));
  return updateYtdlp({
    bin,
    localBin: local('yt-dlp'),
    capture,
    downloadLatest: async (tmp) => {
      await fetchTo(YTDLP_URL, tmp, 'ytdlp', language);
      if (!WIN) fs.chmodSync(tmp, 0o755);
    },
    language,
  });
});

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

// เปิดได้เฉพาะโฟลเดอร์ ไม่ให้หน้าจอสั่งรันไฟล์ใด ๆ
ipcMain.handle('open-folder', async (_e, dir) => {
  const stat = await fs.promises.stat(String(dir)).catch(() => null);
  if (!stat?.isDirectory()) return 'not-found';
  return shell.openPath(dir);
});

ipcMain.handle('show-file', (_e, file) => {
  if (fs.existsSync(String(file))) shell.showItemInFolder(file);
});

ipcMain.handle('set-theme', (_e, theme) => {
  nativeTheme.themeSource = theme === 'dark' || theme === 'light' ? theme : 'system';
});

// ---------- แปลงวิดีโอ (H.264 เข้าโปรแกรมตัดต่อได้ทุกตัว / H.265 ไฟล์เล็กกว่า) ----------

const ffBin = (name, ff) => (ff === 'local' ? local(name) : name);

const TARGETS = {
  h264: { name: 'H.264', profile: 'high', extra: [] },
  hevc: { name: 'H.265', profile: 'main', extra: ['-tag:v', 'hvc1'] },
};
const EIGHT_BIT = ['yuv420p', 'yuvj420p'];
// ใช้ค่าคุณภาพสูงเพื่อเก็บรายละเอียดของต้นฉบับ แม้ไฟล์ที่ได้จะใหญ่ขึ้น
const ENCODERS = [
  {
    id: 'nvenc', name: 'NVIDIA NVENC', decode: 'cuda', format: 'yuv420p',
    codec: { h264: 'h264_nvenc', hevc: 'hevc_nvenc' }, quality: { h264: 14, hevc: 16 },
    variants: [
      (q) => ['-preset', 'p2', '-rc', 'vbr', '-cq', q, '-b:v', 0, '-spatial-aq', 1, '-bf', 3],
      (q) => ['-preset', 'p2', '-rc', 'vbr', '-cq', q, '-b:v', 0],
    ],
  },
  {
    id: 'qsv', name: 'Intel Quick Sync', decode: 'qsv', format: 'nv12',
    codec: { h264: 'h264_qsv', hevc: 'hevc_qsv' }, quality: { h264: 14, hevc: 16 },
    variants: [(q) => ['-preset', 'veryfast', '-async_depth', 8, '-global_quality', q]],
  },
  {
    // ไม่ใช้ถอดรหัสด้วย GPU ของ AMD: ทดสอบแล้วเฟรมหายบางส่วน ทำให้ภาพกับเสียงเหลื่อมกัน
    id: 'amf', name: 'AMD AMF', format: 'yuv420p',
    codec: { h264: 'h264_amf', hevc: 'hevc_amf' }, quality: { h264: 14, hevc: 16 },
    variants: [(q, target) => ['-quality', 'balanced', '-rc', 'cqp', '-qp_i', q, '-qp_p', q + 2,
      ...(target === 'h264' ? ['-qp_b', q + 4] : [])]],
  },
];
const CPU = {
  id: 'cpu', name: 'CPU', format: 'yuv420p',
  codec: { h264: 'libx264', hevc: 'libx265' }, quality: { h264: 14, hevc: 16 },
  variants: [(q, target) => ['-preset', 'veryfast', '-crf', q,
    ...(target === 'hevc' ? ['-x265-params', 'log-level=error'] : [])]],
};

// FFmpeg อาจมี encoder ในไบนารีแต่ไดรเวอร์หรืออุปกรณ์ใช้ไม่ได้: ทดสอบจริงก่อนเลือก
// คืนค่าลำดับชุดตัวเลือกที่ใช้ได้ หรือ -1 ถ้าใช้ไม่ได้
const encoderSupport = new Map();
function encoderVariant(enc, target, ff) {
  const key = `${ffBin('ffmpeg', ff)}:${enc.id}:${target}`;
  if (!encoderSupport.has(key)) {
    encoderSupport.set(key, (async () => {
      for (const [index, variant] of enc.variants.entries()) {
        const ok = await runs(ffBin('ffmpeg', ff), [
          '-hide_banner', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=640x360:r=30:d=0.3',
          '-c:v', enc.codec[target], ...variant(enc.quality[target], target),
          '-pix_fmt', enc.format, '-profile:v', TARGETS[target].profile, '-f', 'null', '-',
        ]);
        if (ok) return index;
      }
      return -1;
    })());
  }
  return encoderSupport.get(key);
}

ipcMain.handle('encoders', async () => {
  const ff = await findFfmpeg();
  if (!ff) return {};
  const found = await Promise.all(ENCODERS.map(async (enc) => [enc.id, await encoderVariant(enc, 'h264', ff) >= 0]));
  return Object.fromEntries(found);
});

function encoderOrder(choice) {
  if (choice === 'cpu') return [CPU];
  const selected = ENCODERS.find((enc) => enc.id === choice);
  return selected ? [selected, CPU] : [...ENCODERS, CPU];
}

// ไฟล์ 10-bit ถอดรหัสด้วย GPU แล้วส่งเข้า encoder 8-bit ไม่ได้ จึงถอดรหัสด้วย CPU ตั้งแต่แรก
function decodeOptions(enc, choice, info) {
  if (!enc.decode || choice === 'hybrid' || !EIGHT_BIT.includes(info.v.pix_fmt)) return [false];
  return [true, false];
}

async function probe(file, ff) {
  const output = await capture(ffBin('ffprobe', ff), [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,pix_fmt,bit_rate:format=duration,bit_rate',
    '-of', 'json', file,
  ]);
  const j = JSON.parse(output || '{}');
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  const a = (j.streams || []).find((s) => s.codec_type === 'audio');
  return { v, a, duration: parseFloat(j.format?.duration) || 0, bitRate: Number(j.format?.bit_rate) || 0 };
}

// รัน process แล้วรอจบ ทุก process อยู่ใน procs เพื่อให้ปุ่มยกเลิกหยุดได้ทั้งหมด
function run(bin, args, onLine) {
  return new Promise((resolve) => {
    const child = spawn(bin, args.map(String), {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ELECTRON_RUN_AS_NODE: '1' },
    });
    procs.add(child);
    lowerPriority(child);
    const pending = { stdout: '', stderr: '' };
    const decoders = Object.fromEntries(['stdout', 'stderr'].map((stream) => [stream, new StringDecoder('utf8')]));
    for (const stream of ['stdout', 'stderr']) {
      child[stream].on('data', (buf) => {
        pending[stream] += decoders[stream].write(buf);
        const lines = pending[stream].split(/\r?\n/);
        pending[stream] = lines.pop();
        for (const line of lines) if (line.trim()) onLine(line);
      });
    }
    child.on('error', (error) => { onLine(error.message); procs.delete(child); resolve(1); });
    child.on('close', (code) => {
      for (const stream of ['stdout', 'stderr']) pending[stream] += decoders[stream].end();
      for (const line of Object.values(pending)) if (line.trim()) onLine(line);
      procs.delete(child);
      resolve(code);
    });
  });
}

function clock(secs) {
  const s = Math.max(0, Math.round(secs));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function encode({ file, tmp, info, enc, variant, target, ff, hardwareDecode, language, name }) {
  const args = [
    '-hide_banner', '-v', 'error', '-y', '-progress', 'pipe:1', '-nostats',
    ...(hardwareDecode ? ['-hwaccel', enc.decode, '-hwaccel_output_format', enc.decode] : []),
    '-i', file, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '0',
    '-c:v', enc.codec[target], ...enc.variants[variant](enc.quality[target], target),
    ...(hardwareDecode ? [] : ['-pix_fmt', enc.format]),
    '-profile:v', TARGETS[target].profile,
    ...TARGETS[target].extra,
    // ไฟล์ในเครื่องไม่ต้องใช้ +faststart ซึ่งต้องเขียนไฟล์ทั้งไฟล์ซ้ำอีกรอบ
    ...(info.a?.codec_name === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k']),
    tmp,
  ];
  const device = enc.id === 'cpu' ? `CPU ${enc.codec[target].replace('lib', '')}` : enc.name;
  const decodeLabel = hardwareDecode ? say(language, ' + ถอดรหัสด้วย GPU', ' + GPU decode') : '';
  const label = say(language, `กำลังแปลงเป็น ${TARGETS[target].name} · ${device}${decodeLabel}`,
    `Converting to ${TARGETS[target].name} · ${device}${decodeLabel}`);
  send('progress', { stage: 'convert', pct: 0, label, name });
  const started = Date.now();
  let speed = '';
  let lastProgress = 0;
  return run(ffBin('ffmpeg', ff), args, (line) => {
    const [k, v = ''] = line.split('=');
    if (k === 'speed') speed = v.trim() === 'N/A' ? '' : v.trim().replace(/x$/, '×');
    else if (k === 'out_time_us') {
      const done = Number(v) / 1e6;
      if (!info.duration || !Number.isFinite(done) || done < 0) return;
      const pct = Math.min(100, (done / info.duration) * 100);
      if (Date.now() - lastProgress < 120 && pct < 100) return;
      lastProgress = Date.now();
      const eta = pct > 1 ? clock(((Date.now() - started) / 1000) * (100 / pct - 1)) : '';
      send('progress', { stage: 'convert', pct, speed, eta, label, name });
    } else if (!/^[a-z_0-9]+=/.test(line)) {
      send('log', line);
    }
  });
}

// คืนค่า { code, file } โดย file คือไฟล์สุดท้าย (อาจเปลี่ยนนามสกุลเป็น .mp4)
async function convert(file, ff, { encoder, target, language, name = path.basename(file) }) {
  send('progress', { stage: 'convert', pct: 0, label: say(language, 'กำลังตรวจสอบไฟล์', 'Checking file'), name });
  const info = await probe(file, ff);
  if (cancelled) return { code: -1, file };
  if (!info.v) {
    send('log', say(language, 'ไฟล์นี้ไม่มีวิดีโอให้แปลง', 'This file has no video stream to convert'));
    return { code: 1, file };
  }

  send('log', say(language,
    `แปลงไฟล์: ${info.v.codec_name}/${info.a?.codec_name ?? '-'} → ${target}/aac`,
    `Converting ${info.v.codec_name}/${info.a?.codec_name ?? '-'} to ${target}/aac`));
  const base = file.replace(/\.[^.\\/]+$/, '');
  const tmp = base + '.frameport-part.mp4';
  const job = { file, tmp, info, target, ff, language, name };
  let code = 1;
  for (const enc of encoderOrder(encoder)) {
    if (cancelled) break;
    const variant = await encoderVariant(enc, target, ff);
    if (variant < 0) {
      send('log', say(language, `${enc.name} ใช้ไม่ได้บนเครื่องนี้`, `${enc.name} is unavailable`));
      continue;
    }
    for (const hardwareDecode of decodeOptions(enc, encoder, info)) {
      if (cancelled) break;
      code = await encode({ ...job, enc, variant, hardwareDecode });
      if (code === 0 || cancelled) break;
      const method = hardwareDecode ? say(language, ' ถอดรหัสด้วย GPU', ' with GPU decode') : '';
      send('log', say(language,
        `${enc.name}${method} ไม่สำเร็จ กำลังลองวิธีถัดไป`,
        `${enc.name}${method} failed; trying the next option`));
    }
    if (code === 0) break;
  }
  if (code === 0 && !cancelled) {
    const encoded = await probe(tmp, ff);
    if (encoded.v?.codec_name !== target) {
      throw new Error(say(language, 'ตรวจสอบไฟล์หลังแปลงไม่ผ่าน', 'Converted video failed verification'));
    }
    if (info.bitRate && encoded.bitRate) {
      const before = (info.bitRate / 1e6).toFixed(1);
      const after = (encoded.bitRate / 1e6).toFixed(1);
      send('log', say(language, `บิตเรตต้นทาง ${before} → หลังแปลง ${after} Mb/s`,
        `Bitrate: source ${before} → converted ${after} Mb/s`));
    }
    return { code: 0, file: tmp };
  }
  fs.rmSync(tmp, { force: true });
  return { code: cancelled ? -1 : code || 1, file };
}

// kind: 'video' | 'audio'
// quality (video): 'best' | '2160' | '1440' | '1080' | '720' | '480'
// quality (audio): 'mp3' | 'wav' | 'flac'
// output (video): 'h264' | 'hevc' | 'original'
ipcMain.handle('download', async (_e, options) => {
  const { url, kind, quality, playlist, encoder = 'auto', output = 'h264', language = 'th' } = options;
  const link = String(url || '').trim();
  if (busy) throw new Error(say(language, 'มีงานดาวน์โหลดกำลังทำงานอยู่', 'A download is already running'));
  if (!/^https?:\/\/\S+$/i.test(link)) {
    throw new Error(say(language, 'ลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย http:// หรือ https://', 'Invalid link. It must start with http:// or https://'));
  }
  const [bin, ff] = await Promise.all([findYtdlp(), findFfmpeg()]);
  if (!bin) throw new Error(say(language, 'ยังไม่มี yt-dlp', 'yt-dlp is not installed'));
  if (!ff) throw new Error(say(language, 'ยังไม่มี ffmpeg', 'FFmpeg is not installed'));
  const folder = options.folder || app.getPath('downloads');
  fs.mkdirSync(folder, { recursive: true });

  busy = true;
  cancelled = false;
  let tempPrefix = '';
  const preserveFiles = new Set();
  try {
    const target = TARGETS[output] ? output : null;
    tempPrefix = `.frameport-${randomBytes(8).toString('hex')}-`;
    const args = [
      '-P', folder,
      // จำกัดความยาวชื่อไฟล์ กันเกิน path limit ของ Windows
      '-o', `${tempPrefix}%(title).180B.%(ext)s`,
      '--no-overwrites',
      '--no-mtime',
      '--newline',
      '--progress',
      '--concurrent-fragments', '8',
      '--js-runtimes', `node:${process.execPath}`,
      '--remote-components', 'ejs:github',
      '--progress-template',
      'download:[P]%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(info.playlist_index)s|%(info.n_entries)s',
      // ได้ชื่อไฟล์ทันทีที่แต่ละไฟล์เสร็จ เพื่อแปลงไฟล์ก่อนหน้าไปพร้อมกับดาวน์โหลดไฟล์ถัดไป
      '--print', 'after_move:[F]%(filepath)j',
      playlist ? '--yes-playlist' : '--no-playlist',
    ];
    if (ff === 'local') args.push('--ffmpeg-location', binDir());

    if (kind === 'audio') {
      args.push('-f', 'ba/b', '-x', '--audio-format', quality, '--audio-quality', '0', '--embed-metadata');
    } else {
      // เลือกความละเอียดและ fps สูงสุดก่อน แล้วค่อยเลือกบิตเรตสูงสุดของฟอร์แมตที่เหลือ
      const res = quality === 'best' ? 'res' : `res:${quality}`;
      args.push(
        '-f', 'bv+ba/b',
        '-S', `${res},fps,hdr:sdr,br`,
        '--merge-output-format', 'mp4',
        '--remux-video', 'mp4',
      );
    }
    args.push('--', link);

    const files = [];
    const seen = new Set();
    const reservedNames = new Set();
    const completed = [];
    let converting = Promise.resolve();
    let convertCode = 0;
    let lastError = '';
    const onFile = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      const basename = path.basename(file);
      const namedSource = path.join(path.dirname(file),
        basename.startsWith(tempPrefix) ? basename.slice(tempPrefix.length) : basename);
      const reserved = reserveVersionedPath({
        folder,
        downloadedPath: namedSource,
        finalExtension: kind === 'video' && target ? '.mp4' : path.extname(file),
        reserved: reservedNames,
      });
      if (reserved.version > 1) {
        const savedName = kind === 'video' && target ? reserved.finalPath : reserved.path;
        send('log', say(language,
          `มีไฟล์ชื่อนี้แล้ว บันทึกเป็นเวอร์ชัน ${reserved.version}: ${path.basename(savedName)}`,
          `This clip already exists. Saved as version ${reserved.version}: ${path.basename(savedName)}`));
      }
      converting = converting.then(async () => {
        let result = { code: cancelled ? -1 : 0, file };
        try {
          if (kind === 'video' && target && !cancelled) {
            result = await convert(file, ff, { encoder, target, language, name: path.basename(namedSource) });
          }
        } catch (error) {
          send('log', error.message);
          lastError = error.message;
          result = { code: 1, file };
        }
        if (result.code !== 0) convertCode = result.code;
        completed.push({ source: file, namedSource, file: result.file, reserved,
          converted: result.code === 0 && kind === 'video' && !!target });
      });
    };

    const label = say(language, 'กำลังดาวน์โหลด', 'Downloading');
    let lastProgress = 0;
    let code = await run(bin, args, (line) => {
      if (line.startsWith('[P]')) {
        const [pct, speed, eta, index, total] = line.slice(3).split('|').map((s) => s.trim());
        const value = parseFloat(pct) || 0;
        if (Date.now() - lastProgress < 120 && value < 100) return;
        lastProgress = Date.now();
        const item = /^\d+$/.test(index) && /^\d+$/.test(total) ? `${index}/${total}` : '';
        send('progress', { stage: 'download', pct: value, speed, eta, label, item });
      } else if (line.startsWith('[F]')) {
        onFile(JSON.parse(line.slice(3).trim()));
      } else {
        if (/^ERROR:/.test(line)) lastError = line.replace(/^ERROR:\s*/, '');
        send('log', line);
      }
    });
    await converting;
    for (const entry of completed) {
      let destination = entry.converted ? entry.reserved.finalPath : entry.reserved.path;
      if (!fs.existsSync(entry.file)) {
        if (entry.converted && fs.existsSync(entry.source)) {
          entry.file = entry.source;
          entry.converted = false;
          destination = entry.reserved.path;
          convertCode = 1;
          lastError = say(language, 'ไฟล์แปลงไม่สำเร็จ กำลังบันทึกไฟล์ต้นฉบับแทน',
            'Conversion output is missing; saving the original file instead');
          send('log', lastError);
        } else {
          lastError = say(language, `ไม่พบไฟล์ที่ดาวน์โหลด: ${entry.file}`, `Downloaded file not found: ${entry.file}`);
          send('log', lastError);
          convertCode = 1;
          continue;
        }
      }
      try {
        if (fs.existsSync(destination)) {
          const next = reserveVersionedPath({
            folder, downloadedPath: entry.namedSource,
            finalExtension: path.extname(entry.reserved.finalPath), reserved: reservedNames,
          });
          destination = entry.converted ? next.finalPath : next.path;
        }
        if (entry.converted) fs.rmSync(entry.source, { force: true });
        fs.renameSync(entry.file, destination);
        files.push(destination);
      } catch (error) {
        preserveFiles.add(entry.source);
        preserveFiles.add(entry.file);
        files.push(entry.file);
        convertCode = 1;
        lastError = error.message;
        send('log', say(language,
          `จัดชื่อไฟล์ไม่สำเร็จ ไฟล์ยังอยู่ที่ ${entry.file}: ${error.message}`,
          `Could not organize the file; it remains at ${entry.file}: ${error.message}`));
      }
    }
    if (code === 0) code = convertCode;
    if (code === 0 && files.length === 0) {
      code = 1;
      lastError = say(language, 'ไม่มีไฟล์ที่ดาวน์โหลดสำเร็จ', 'No downloaded file was produced');
    }
    return { code: cancelled ? -1 : code, files, error: code === 0 ? '' : lastError };
  } finally {
    try {
      if (tempPrefix) {
        for (const name of fs.readdirSync(folder)) {
          const file = path.join(folder, name);
          if (name.startsWith(tempPrefix) && !preserveFiles.has(file)) {
            fs.rmSync(file, { recursive: true, force: true });
          }
        }
      }
    } finally {
      busy = false;
    }
  }
});

// yt-dlp.exe มี process ลูก ต้องฆ่าทั้งต้นไม้
async function killProc() {
  cancelled = true;
  await Promise.all([...procs].map((child) =>
    WIN ? runs('taskkill', ['/pid', String(child.pid), '/T', '/F']) : child.kill()));
}

ipcMain.handle('cancel', killProc);
