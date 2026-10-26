// ใส่ดนตรี + เสียงประกอบให้คลิป simple (ใช้ FFmpeg ที่ FramePort ติดตั้งไว้)
// ใช้: node promo/mix-sound.js [ชื่อคลิป=FramePort-simple-th]
// เวลาทุกเสียงตรงกับไทม์ไลน์ AT ใน simple.html (วินาทีจริง) ให้ตรงเฟรม
// pan ตามตำแหน่งบนจอ (x ของชิ้นส่วน / 960 - 1) แล้วลดครึ่งให้ฟังสบายในหูฟัง
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const clip = process.argv[2] || 'FramePort-simple-th';
const input = path.join(dir, `${clip}.mp4`);
const output = path.join(dir, `${clip}-sound.mp4`);
const localFfmpeg = path.join(process.env.APPDATA || '', 'FramePort', 'bin', 'ffmpeg.exe');
const ffmpeg = process.env.FFMPEG || (fs.existsSync(localFfmpeg) ? localFfmpeg : 'ffmpeg');
const S = (name) => path.join(dir, 'Sound', name);

const DURATION = 20.5; // ต้องตรงกับ DURATION ใน simple.html
// จุดตกแรกของเพลงอยู่ที่ 1.70s → ไอคอนเด้งกลางประโยคเปิด (0.80s) · ช่วงเบรกของเพลง (คลิป ~14.4–15.5s) = ผืนหน้าต่าง "ครบในหน้าจอเดียว" → เลื่อนโฟกัสเข้าฉากปิดท้าย
// เพลงกลับมาเต็มที่ 16.64s ในไฟล์ = 15.74s ในคลิป = ลูกศรโลโก้ปิดท้ายตก
const MUSIC_START = 0.9;
const MUSIC_FADE = 1.8;

// hit = เวลาในไฟล์ที่เป็นจังหวะหลักของเสียง (transient / จุดดังสุดของ whoosh), trim = ตัดหางยาวทิ้งพร้อมเฟด
// stereo = คงความกว้างสเตอริโอเดิม (ไม่ pan)
const SFX = {
  rise: { file: S('ksjsbwuil-whoosh3-481204.mp3'), hit: .52, gain: -15 },
  reveal: { file: S('koiroylers-whoosh-cinematic-1-355739.mp3'), hit: .5, gain: -7, trim: 1.6 },
  impact: { file: S('koiroylers-impact-whoosh-351956.mp3'), hit: .5, gain: -10, trim: 2.2, stereo: true },
  swipe1: { file: S('floraphonic-infographic-swipe-1-184021.mp3'), hit: .15, gain: -15 },
  swipe2: { file: S('floraphonic-infographic-swipe-2-184023.mp3'), hit: .2, gain: -15 },
  click: { file: S('denielcz-immersivecontrol-button-click-sound-463065.mp3'), hit: .024, gain: -7 },
  select: { file: S('musicholder-click-sfx-287654.mp3'), hit: 0, gain: 7 },
  tap: { file: S('vadim_makes_sound-soft-app-button-tap-sound-2-547872.mp3'), hit: .024, gain: -12, trim: .2 },
  pop: { file: S('u_o8xh7gwsrj-bubble_pop_1-476367.mp3'), hit: .052, gain: -6 },
  typing: { file: S('dragon-studio-keyboard-typing-sound-effect-335503.mp3'), hit: .02, gain: -17 },
};

// [เวลาในคลิป, เสียง, pan -1..1, ตัวเลือก] · sweep = [pan เริ่ม, pan จบ] เคลื่อนรอบจุด hit
const CUES = [
  [.30, 'rise', 0, { gain: -18 }],                      // การ์ดกระจกลอยขึ้น
  [2.85, 'swipe1', 0, { gain: -18 }],                   // การ์ดกระจายออก เลื่อนโฟกัส
  [3.72, 'pop', 0, { gain: -4 }],                       // ลูกศรในไอคอนตก
  [5.05, 'swipe2', 0, { gain: -21 }],                   // เลื่อนโฟกัสเข้าฉากสามขั้นตอน
  [5.90, 'click', .5],                                  // กดวางลิงก์
  [6.95, 'select', .4],                                 // คลิก 4K
  [7.90, 'tap', .5, { gain: -10 }],                     // กดเริ่มดาวน์โหลด
  [8.45, 'swipe1', 0, { gain: -20 }],                   // เลื่อนโฟกัส
  [9.08, 'pop', 0, { gain: -16 }],                      // ป้ายตัวเข้ารหัส
  [10.02, 'pop', 0, { gain: -6 }],                      // เสร็จแล้ว
  [10.65, 'swipe2', 0, { gain: -20 }],                  // เลื่อนโฟกัส
  [13.08, 'reveal', 0, { sweep: [.4, -.4], gain: -14 }], // ผืนหน้าต่างโปรแกรม
  [15.20, 'impact', 0, { gain: -15 }],                  // เลื่อนโฟกัสเข้าฉากปิดท้าย
  [15.74, 'pop', 0, { gain: -3 }],                      // เพลงกลับมา + ลูกศรโลโก้ตก
  [17.02, 'tap', 0, { gain: -16 }],                     // พัฒนาโดย CandyCore
];

// constant-power pan: กลาง = 0 dB ทั้งสองข้าง
const panGain = (p) => [Math.SQRT2 * Math.cos((p + 1) * Math.PI / 4), Math.SQRT2 * Math.sin((p + 1) * Math.PI / 4)];
// pan เคลื่อนจาก a → b ในช่วง hit-0.15 ถึง hit+0.3 ของไฟล์
const panExpr = (a, b, side, hit) => `${Math.SQRT2}*${side}((${a}+(${b - a})*clip((t-${(hit - .15).toFixed(3)})/.45\,0\,1)+1)*PI/4)`;

const inputs = ['-i', input, '-ss', MUSIC_START, '-t', DURATION + 1, '-i', S('Music.mp3')];
const graph = [];
const labels = [];
CUES.forEach(([time, name, pan, opt = {}], i) => {
  const sfx = SFX[name];
  const from = opt.from || 0;
  inputs.push('-ss', from, ...(opt.dur ? ['-t', opt.dur] : sfx.trim ? ['-t', sfx.trim] : []), '-i', sfx.file);
  const n = inputs.filter((v) => v === '-i').length - 1;
  const delay = Math.max(0, Math.round((time - sfx.hit) * 1000));
  const gain = opt.gain ?? sfx.gain;
  const len = opt.dur || sfx.trim;
  const fadeLen = len ? Math.min(.25, len * .25) : 0;
  const fade = len ? `,afade=t=out:st=${(len - fadeLen).toFixed(3)}:d=${fadeLen.toFixed(3)}` : '';
  const pre = `[${n}:a]aresample=48000,${sfx.stereo ? 'aformat=channel_layouts=stereo' : 'aformat=channel_layouts=mono'},volume=${gain}dB${fade}`;
  if (opt.sweep) {
    const [a, b] = opt.sweep;
    graph.push(`${pre},asetnsamples=n=128,asplit[w${i}l][w${i}r]`,
      `[w${i}l]volume='${panExpr(a, b, 'cos', sfx.hit)}':eval=frame[w${i}L]`,
      `[w${i}r]volume='${panExpr(a, b, 'sin', sfx.hit)}':eval=frame[w${i}R]`,
      `[w${i}L][w${i}R]join=inputs=2:channel_layout=stereo,adelay=${delay}:all=1[c${i}]`);
  } else if (sfx.stereo) {
    graph.push(`${pre},adelay=${delay}:all=1[c${i}]`);
  } else {
    const [l, r] = panGain(pan);
    graph.push(`${pre},pan=stereo|c0=${l.toFixed(4)}*c0|c1=${r.toFixed(4)}*c0,adelay=${delay}:all=1[c${i}]`);
  }
  labels.push(`[c${i}]`);
});

// รวมเสียงประกอบ + ห้องเล็กๆ ให้กลืนกับเพลง แล้วแยกสายไว้กดเพลง (sidechain) เบาๆ
graph.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,volume=10dB,apad=whole_dur=${DURATION},highpass=f=90,aecho=0.8:0.6:38|67:0.12|0.07,asplit[sfx][key]`);
// เพลงต้นฉบับดังมาก (-9.5 LUFS) → ลดลง, เว้นช่วง 2.5–4 kHz ให้เสียงคลิก, เฟดออกตอนเบรกของเพลง
graph.push(`[1:a]aresample=48000,volume=-10dB,highpass=f=30,equalizer=f=3200:t=q:w=1.2:g=-2,afade=t=out:st=${DURATION - MUSIC_FADE}:d=${MUSIC_FADE}[mus]`);
graph.push('[mus][key]sidechaincompress=threshold=0.03:ratio=3:attack=5:release=180:makeup=1[duck]');
graph.push(`[duck][sfx]amix=inputs=2:normalize=0,atrim=0:${DURATION},alimiter=limit=0.79:attack=3:release=60:level=disabled[out]`);

const args = ['-y', '-hide_banner', '-loglevel', 'error', ...inputs.map(String),
  '-filter_complex', graph.join(';'), '-map', '0:v', '-map', '[out]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', output];
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Saved ${output}`);
