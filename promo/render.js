// เรนเดอร์คลิปใน promo/ เป็น MP4 (1920×1080, H.264) ด้วย Electron แบบ offscreen + FFmpeg
// ใช้: npx electron promo/render.js <launch|intro> [th|en] [light|dark] [--samples=N] [--still=วินาที,...] [--out=โฟลเดอร์]
// fps, ความยาว และ motion blur อ่านจาก window.FramePortClip ในหน้าคลิป
// --still ส่งออกเฟรมเดี่ยว (มี motion blur) เป็น PNG แทนวิดีโอ เช่นใช้ทำภาพปก
// ต้องมี FFmpeg: ใช้ตัวที่ FramePort ติดตั้งไว้ (%APPDATA%\FramePort\bin) หรือกำหนด FFMPEG=path
const { app, BrowserWindow, nativeImage } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const W = 1920;
const H = 1080;
const args = process.argv.slice(2);
const [clip = 'launch', lang = 'th', theme = 'light'] = args.filter((arg) => !arg.startsWith('-'));
const option = (name) => (args.find((arg) => arg.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const samplesOverride = Number(option('samples')) || 0;
const stills = option('still') ? option('still').split(',').map(Number) : [];
const outDir = option('out') ? path.resolve(option('out')) : __dirname;
const localFfmpeg = path.join(process.env.APPDATA || '', 'FramePort', 'bin', 'ffmpeg.exe');
const ffmpeg = process.env.FFMPEG || (fs.existsSync(localFfmpeg) ? localFfmpeg : 'ffmpeg');
const version = require('../package.json').version;
const baseName = `FramePort-${clip}-${lang}${theme === 'dark' ? '-dark' : ''}`;
const output = path.join(outDir, `${baseName}.mp4`);

// motion blur: รวมเฟรมย่อยใน linear light (เหมือนแสงสะสมบนเซนเซอร์กล้อง) แล้วแปลงกลับเป็น sRGB พร้อม dither กันแถบสี
const LEVELS = 16384;
const toLinear = new Float32Array(256).map((_, i) => {
  const c = i / 255;
  return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
});
const toSrgb = new Float32Array(LEVELS + 1).map((_, i) => {
  const v = i / LEVELS;
  return 255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055);
});

class Accumulator {
  constructor(pixels) {
    this.sum = new Float32Array(pixels * 3);
    this.out = new Uint8ClampedArray(pixels * 4).fill(255);
    this.count = 0;
    this.seed = 2463534242;
  }
  reset() {
    this.sum.fill(0);
    this.count = 0;
  }
  add(bgra) {
    const sum = this.sum;
    for (let p = 0, i = 0; i < sum.length; p += 4, i += 3) {
      sum[i] += toLinear[bgra[p]];
      sum[i + 1] += toLinear[bgra[p + 1]];
      sum[i + 2] += toLinear[bgra[p + 2]];
    }
    this.count++;
  }
  frame() {
    const { sum, out } = this;
    const scale = LEVELS / this.count;
    let seed = this.seed;
    for (let p = 0, i = 0; i < sum.length; p += 4, i += 3) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const dither = (seed >>> 0) / 4294967296 - .5;
      out[p] = toSrgb[Math.min(LEVELS, (sum[i] * scale) | 0)] + dither;
      out[p + 1] = toSrgb[Math.min(LEVELS, (sum[i + 1] * scale) | 0)] + dither;
      out[p + 2] = toSrgb[Math.min(LEVELS, (sum[i + 2] * scale) | 0)] + dither;
    }
    this.seed = seed;
    // คืนสำเนา: บัฟเฟอร์เดิมจะถูกเขียนทับในเฟรมถัดไป ขณะที่ FFmpeg อาจยังอ่านไม่เสร็จ
    return Buffer.from(out.buffer.slice(0));
  }
}

// ตัวตรวจเฟรม: สีบล็อก 4×4 px มุมขวาล่างเข้ารหัสลำดับเฟรมย่อย (3 บิตต่อสี = 512 ค่า)
// เพราะ capturePage อาจคืนภาพเฟรมก่อนหน้าที่ยังวาดไม่ทัน จึงรับเฉพาะภาพที่สีตรงกับลำดับที่เพิ่งสั่ง
const MARK = 4;
const markDigits = (token) => [(token >> 6) & 7, (token >> 3) & 7, token & 7];
function readMark(bgra) {
  const i = ((H - 2) * W + (W - 2)) * 4;
  return [bgra[i + 2], bgra[i + 1], bgra[i]].map((v) => Math.round((v - 3) / 36));
}
function eraseMark(bgra) {
  for (let y = H - MARK; y < H; y++) {
    const source = (y * W + (W - MARK - 1)) * 4;
    for (let x = W - MARK; x < W; x++) bgra.copy(bgra, (y * W + x) * 4, source, source + 4);
  }
}

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: W, height: H, useContentSize: true, show: false, frame: false,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true },
  });
  // Windows จำกัดขนาดหน้าต่างตอนสร้างไว้ไม่เกินพื้นที่จอ (ไม่นับ taskbar) จึงตั้งขนาดจริงอีกครั้งหลังสร้าง
  win.setContentSize(W, H);
  win.webContents.setFrameRate(240);
  const run = (code) => win.webContents.executeJavaScript(code);
  await win.loadFile(path.join(__dirname, `${clip}.html`), { query: { lang, theme, v: version, render: '1' } });
  const viewport = await run('[innerWidth, innerHeight]');
  if (viewport[0] !== W || viewport[1] !== H) throw new Error(`Viewport is ${viewport.join('×')}, expected ${W}×${H}`);
  const spec = await run('FramePortClip.ready().then(() => ({ duration: FramePortClip.duration, fps: FramePortClip.fps, samples: FramePortClip.samples, shutter: FramePortClip.shutter }))');
  const samples = samplesOverride || spec.samples || 1;
  const frames = Math.round(spec.duration * spec.fps);
  await run(`(() => {
    const mark = document.createElement('div');
    mark.id = '__renderMark';
    mark.style.cssText = 'position:fixed;right:0;bottom:0;width:${MARK}px;height:${MARK}px;z-index:2147483647;pointer-events:none';
    document.body.append(mark);
  })()`);
  let token = 0;
  let stale = 0;
  const grab = async (time) => {
    token = (token + 1) % 512;
    const digits = markDigits(token);
    await run(`document.getElementById('__renderMark').style.background = 'rgb(${digits.map((v) => v * 36 + 3).join(',')})'; FramePortClip.renderAt(${time})`);
    for (let attempt = 0; ; attempt++) {
      const image = await win.webContents.capturePage();
      const size = image.getSize();
      if (size.width !== W || size.height !== H) throw new Error(`Captured ${size.width}×${size.height}, expected ${W}×${H}`);
      const bitmap = image.toBitmap();
      if (readMark(bitmap).every((v, i) => v === digits[i])) {
        eraseMark(bitmap);
        return bitmap;
      }
      if (attempt > 60) throw new Error(`Frame at ${time}s never reached the capture`);
      stale++;
      await run('new Promise((resolve) => requestAnimationFrame(() => resolve()))');
    }
  };
  const accumulator = samples > 1 ? new Accumulator(W * H) : null;
  const shutter = (spec.shutter || .5) / spec.fps;
  // หนึ่งเฟรมของวิดีโอ: ถ้ามี motion blur จะเฉลี่ยเฟรมย่อยที่กระจายอยู่ในช่วงชัตเตอร์รอบเวลานั้น
  const renderFrame = async (time) => {
    if (!accumulator) return grab(time);
    accumulator.reset();
    for (let k = 0; k < samples; k++) {
      const sub = time + ((k + .5) / samples - .5) * shutter;
      accumulator.add(await grab(Math.min(spec.duration - 1e-4, Math.max(0, sub))));
    }
    return accumulator.frame();
  };
  fs.mkdirSync(outDir, { recursive: true });

  if (stills.length) {
    for (const time of stills) {
      const file = path.join(outDir, `${baseName}@${time}s.png`);
      fs.writeFileSync(file, nativeImage.createFromBitmap(await renderFrame(time), { width: W, height: H }).toPNG());
      console.log(`Saved ${file} (stale captures skipped so far: ${stale})`);
    }
    app.exit(0);
    return;
  }

  const encoder = spawn(ffmpeg, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${W}x${H}`, '-r', spec.fps, '-i', '-',
    // แปลง RGB → YUV ด้วยเมทริกซ์ BT.709 และติดป้ายสีให้ครบ เครื่องเล่นจะแสดงสีตรงกับที่เรนเดอร์
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
    // aq-mode=3 ให้บิตกับฉากมืดมากขึ้น ลดแถบสีในแสงไล่เฉดบนพื้นดำ
    '-c:v', 'libx264', '-preset', 'slow', '-crf', 18, '-x264-params', 'aq-mode=3', '-profile:v', 'high',
    '-movflags', '+faststart', output,
  ].map(String), { stdio: ['pipe', 'inherit', 'inherit'] });
  const encoded = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}`))));
  });

  const started = Date.now();
  for (let frame = 0; frame < frames; frame++) {
    const bitmap = await renderFrame(frame / spec.fps);
    if (!encoder.stdin.write(bitmap)) await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    if (frame % spec.fps === 0) {
      const elapsed = (Date.now() - started) / 1000;
      process.stdout.write(`\r${clip} ${lang}/${theme}: ${frame}/${frames} frames · ${samples} samples · ${elapsed.toFixed(0)}s`);
    }
  }
  encoder.stdin.end();
  await encoded;
  console.log(`\nSaved ${output} (${frames} frames @ ${spec.fps}fps, ${((Date.now() - started) / 1000).toFixed(0)}s, stale captures skipped: ${stale})`);
  app.exit(0);
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
