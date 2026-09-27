const $ = (id) => document.getElementById(id);
const picked = (name) => document.querySelector(`input[name=${name}]:checked`).value;
const store = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
};

const words = {
  th: {
    appTitle: 'ดาวน์โหลดวิดีโอ', checking: 'กำลังตรวจสอบ…', notInstalled: 'ยังไม่ได้ติดตั้งเครื่องมือ', ready: 'พร้อมใช้งาน', missing: 'ยังไม่มี',
    setupTitle: 'เริ่มใช้งานครั้งแรก', setupDescription: 'ติดตั้งส่วนที่จำเป็นครั้งเดียว แล้วเริ่มดาวน์โหลดได้ทันที',
    setupNote: 'ดาวน์โหลดจาก GitHub ทางการของ yt-dlp',
    ytdlpDescription: 'ตัวดาวน์โหลด · ~18 MB', ffmpegDescription: 'แปลงวิดีโอและเสียง · ~150 MB',
    headline: 'วางลิงก์ แล้วเลือกไฟล์', subhead: 'รองรับ YouTube, TikTok, Facebook, X และอีกหลายเว็บไซต์',
    urlLabel: 'ลิงก์วิดีโอ', urlPlaceholder: 'วางลิงก์วิดีโอ เช่น https://youtu.be/…', paste: 'วางลิงก์', clear: 'ล้างลิงก์',
    format: 'รูปแบบไฟล์', video: 'วิดีโอ', audioOnly: 'เสียง',
    resolution: 'ความละเอียด', best: 'สูงสุด', available: 'ที่มี', smallFile: 'ไฟล์เล็ก',
    audioFormat: 'ไฟล์เสียง', smallPlay: 'เปิดได้ทุกที่', lossless: 'ไม่เสียคุณภาพ', uncompressed: 'ไม่บีบอัด',
    outputLabel: 'ไฟล์วิดีโอที่ได้',
    h264Tag: 'พร้อมตัดต่อ', h264Desc: 'เปิดได้ใน Premiere, Resolve, CapCut และทุกเครื่องเล่น',
    hevcTag: 'คุณภาพสูง', hevcDesc: 'คงรายละเอียดภาพ เหมาะกับโปรแกรมรุ่นใหม่',
    originalTitle: 'ต้นฉบับ', originalTag: 'เร็วที่สุด', originalDesc: 'ไม่แปลงไฟล์ คุณภาพต้นฉบับ (AV1/VP9)',
    saveTo: 'บันทึกที่', choose: 'เปลี่ยน', open: 'เปิดโฟลเดอร์',
    encoderLabel: 'ตัวเข้ารหัสวิดีโอ', auto: 'อัตโนมัติ', recommended: 'แนะนำ',
    encoderAutoDesc: 'เลือก GPU ที่เร็วที่สุดในเครื่องให้เอง', autoUsing: 'ใช้ ',
    encoderNvidiaDesc: 'การ์ดจอ NVIDIA GeForce / RTX', encoderIntelDesc: 'กราฟิก Intel ในตัวหรือ Arc',
    encoderAmdDesc: 'กราฟิก AMD ในตัวหรือ Radeon', encoderHybridDesc: 'แบ่งงานระหว่าง CPU และ GPU',
    hybrid: 'CPU ถอดรหัส + GPU เข้ารหัส', hybridBadge: 'ผสม', encoderCpuDesc: 'x264 / x265 ใช้ได้ทุกเครื่อง',
    detected: 'พบในเครื่อง', notDetected: 'ไม่พบ',
    playlist: 'ดาวน์โหลดทั้งเพลย์ลิสต์',
    start: 'เริ่มดาวน์โหลด', cancel: 'ยกเลิก', update: 'อัปเดต yt-dlp', updateTitle: 'อัปเดต yt-dlp เป็นรุ่นล่าสุด',
    install: 'ติดตั้งเครื่องมือ', installRequired: 'ติดตั้ง yt-dlp และ FFmpeg ก่อนดาวน์โหลด',
    manualInstall: 'ติดตั้งเองจากแพ็กเกจ', installing: 'กำลังติดตั้ง…', extracting: 'กำลังแตกไฟล์…',
    installSuccess: 'ติดตั้งเรียบร้อย พร้อมใช้งาน', installFailed: 'ติดตั้งไม่สำเร็จ: ',
    updating: 'กำลังอัปเดต…', updated: 'อัปเดต yt-dlp แล้ว', updateFailed: 'อัปเดตไม่สำเร็จ: ',
    clipboardFailed: 'อ่านคลิปบอร์ดไม่ได้ วางลิงก์ด้วย Ctrl+V',
    urlRequired: 'วางลิงก์วิดีโอก่อน', urlInvalid: 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://',
    downloading: 'กำลังทำงาน…', starting: 'กำลังเริ่ม…', preparing: 'กำลังเตรียมดาวน์โหลด',
    finished: 'เสร็จแล้ว', savedOne: 'บันทึกไฟล์แล้ว', savedMany: 'บันทึกแล้ว {n} ไฟล์', andMore: ' และอีก {n} ไฟล์',
    cancelled: 'ยกเลิกแล้ว', failed: 'ดาวน์โหลดไม่สำเร็จ', failedHint: 'ตรวจลิงก์ หรือลองอัปเดต yt-dlp แล้วลองใหม่',
    remaining: 'เหลือ ', item: 'ไฟล์ ', switchLanguage: 'เปลี่ยนภาษา', folderMissing: 'ไม่พบโฟลเดอร์นี้',
    languageNotice: 'ตั้งภาษาเริ่มต้นจากประเทศ IP โดยประมาณผ่าน ipwho.is ไม่ใช้ GPS',
    toggleTheme: 'สลับธีมสว่าง/มืด', details: 'รายละเอียดการทำงาน', showInFolder: 'แสดงในโฟลเดอร์',
    trustLocal: 'ทำงานในเครื่องคุณ ไม่ต้องสมัครบัญชี', trustTools: 'ใช้ yt-dlp และ FFmpeg โอเพนซอร์ส',
    trustFiles: 'ไฟล์บันทึกตรงลงโฟลเดอร์ที่คุณเลือก',
  },
  en: {
    appTitle: 'Video Downloader', checking: 'Checking tools…', notInstalled: 'Tools not installed', ready: 'Ready', missing: 'Missing',
    setupTitle: 'Set up for first use', setupDescription: 'Install the required tools once, then start downloading.',
    setupNote: 'Downloaded from the official yt-dlp GitHub releases',
    ytdlpDescription: 'Downloader · ~18 MB', ffmpegDescription: 'Video and audio conversion · ~150 MB',
    headline: 'Paste a link and choose a format', subhead: 'Works with YouTube, TikTok, Facebook, X and many more sites',
    urlLabel: 'Video link', urlPlaceholder: 'Paste a video link, e.g. https://youtu.be/…', paste: 'Paste', clear: 'Clear link',
    format: 'Format', video: 'Video', audioOnly: 'Audio',
    resolution: 'Resolution', best: 'Best', available: 'available', smallFile: 'Smaller',
    audioFormat: 'Audio format', smallPlay: 'Plays anywhere', lossless: 'Lossless', uncompressed: 'Uncompressed',
    outputLabel: 'Video output',
    h264Tag: 'Edit-ready', h264Desc: 'Opens in Premiere, Resolve, CapCut and every player',
    hevcTag: 'High quality', hevcDesc: 'Preserves picture detail for modern apps',
    originalTitle: 'Original', originalTag: 'Fastest', originalDesc: 'No conversion, original quality (AV1/VP9)',
    saveTo: 'Save to', choose: 'Change', open: 'Open folder',
    encoderLabel: 'Video encoder', auto: 'Automatic', recommended: 'Recommended',
    encoderAutoDesc: 'Picks the fastest GPU in this PC', autoUsing: 'Using ',
    encoderNvidiaDesc: 'NVIDIA GeForce / RTX graphics', encoderIntelDesc: 'Intel integrated graphics or Arc',
    encoderAmdDesc: 'AMD integrated graphics or Radeon', encoderHybridDesc: 'Split work between the CPU and GPU',
    hybrid: 'CPU decode + GPU encode', hybridBadge: 'Hybrid', encoderCpuDesc: 'x264 / x265, works on any PC',
    detected: 'Detected', notDetected: 'Not found',
    playlist: 'Download entire playlist',
    start: 'Download', cancel: 'Cancel', update: 'Update yt-dlp', updateTitle: 'Update yt-dlp to the latest version',
    install: 'Install tools', installRequired: 'Install yt-dlp and FFmpeg before downloading',
    manualInstall: 'Install from package manager', installing: 'Installing…', extracting: 'Extracting…',
    installSuccess: 'Installation complete', installFailed: 'Installation failed: ',
    updating: 'Updating…', updated: 'yt-dlp updated', updateFailed: 'Update failed: ',
    clipboardFailed: 'Cannot read the clipboard. Paste with Ctrl+V.',
    urlRequired: 'Paste a video link first', urlInvalid: 'Links must start with http:// or https://',
    downloading: 'Working…', starting: 'Starting…', preparing: 'Preparing download',
    finished: 'Complete', savedOne: 'File saved', savedMany: '{n} files saved', andMore: ' and {n} more',
    cancelled: 'Cancelled', failed: 'Download failed', failedHint: 'Check the link, or update yt-dlp and try again.',
    remaining: 'ETA ', item: 'Item ', switchLanguage: 'Switch language', folderMissing: 'This folder no longer exists',
    languageNotice: 'Default language uses your estimated IP country via ipwho.is. No GPS location is requested.',
    toggleTheme: 'Toggle light/dark theme', details: 'Activity details', showInFolder: 'Show in folder',
    trustLocal: 'Runs on your PC, no account needed', trustTools: 'Built on open-source yt-dlp and FFmpeg',
    trustFiles: 'Files save straight to the folder you choose',
  },
};

const savedLanguage = store.get('language');
let languageWasChosen = savedLanguage === 'th' || savedLanguage === 'en';
let lang = languageWasChosen ? savedLanguage : window.framePortLanguage.fallback();
let theme = store.get('theme') ||
  (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let folder = store.get('folder');
let toolStatus = {};
let detected = null;
let lastFiles = [];
let running = false;

const tr = (key, vars = {}) =>
  (words[lang][key] ?? words.th[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const cleanError = (error) => String(error?.message || error)
  .replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// ---------- theme + language ----------

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  $('themeBtn').setAttribute('aria-pressed', String(theme === 'dark'));
  $('themeBtn').setAttribute('aria-label', tr('toggleTheme'));
  $('themeBtn').title = tr('toggleTheme');
  api.setTheme(theme).catch(() => {});
}

function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = tr(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = tr(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  $('langBtn').textContent = lang === 'th' ? 'EN' : 'ไทย';
  $('langBtn').setAttribute('aria-label', tr('switchLanguage'));
  if (running) $('goText').textContent = tr('downloading');
  applyTheme();
  renderDetected();
  syncEncoderMenu();
  renderStatus();
}

$('langBtn').onclick = () => {
  lang = lang === 'th' ? 'en' : 'th';
  languageWasChosen = true;
  store.set('language', lang);
  applyLanguage();
};

$('themeBtn').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  store.set('theme', theme);
  applyTheme();
};

// ---------- encoder menu ----------

const encoderOptions = [...document.querySelectorAll('.encoder-option')];
const encoderNames = { nvenc: 'NVIDIA NVENC', qsv: 'Intel Quick Sync', amf: 'AMD AMF' };

function renderDetected() {
  for (const badge of document.querySelectorAll('[data-detect]')) {
    if (!detected) continue;
    const found = !!detected[badge.dataset.detect];
    badge.textContent = tr(found ? 'detected' : 'notDetected');
    badge.classList.toggle('found', found);
  }
}

function syncEncoderMenu() {
  const selected = encoderOptions.find((option) => option.dataset.value === $('encoder').value) || encoderOptions[0];
  $('encoderValue').textContent = selected.querySelector('.encoder-option-title').textContent;
  let description = selected.querySelector('.encoder-option-description').textContent;
  if (selected.dataset.value === 'auto' && detected) {
    const best = ['nvenc', 'qsv', 'amf'].find((id) => detected[id]);
    description = tr('autoUsing') + (best ? encoderNames[best] : 'CPU');
  }
  $('encoderDescription').textContent = description;
  for (const option of encoderOptions) option.setAttribute('aria-selected', String(option === selected));
}

function closeEncoderMenu(returnFocus = false) {
  $('encoderMenu').classList.add('hidden');
  $('encoderRow').classList.remove('open');
  $('encoderTrigger').setAttribute('aria-expanded', 'false');
  if (returnFocus) $('encoderTrigger').focus();
}

function openEncoderMenu() {
  $('encoderMenu').classList.remove('hidden');
  $('encoderRow').classList.add('open');
  $('encoderTrigger').setAttribute('aria-expanded', 'true');
  (encoderOptions.find((option) => option.dataset.value === $('encoder').value) || encoderOptions[0]).focus();
}

function chooseEncoder(option) {
  $('encoder').value = option.dataset.value;
  store.set('encoder', option.dataset.value);
  syncEncoderMenu();
  closeEncoderMenu(true);
}

$('encoderTrigger').addEventListener('click', () => {
  if ($('encoderMenu').classList.contains('hidden')) openEncoderMenu();
  else closeEncoderMenu();
});

$('encoderTrigger').addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  openEncoderMenu();
});

for (const option of encoderOptions) {
  option.addEventListener('click', () => chooseEncoder(option));
  option.addEventListener('keydown', (event) => {
    const index = encoderOptions.indexOf(option);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEncoderMenu(true);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseEncoder(option);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? encoderOptions.length - 1 :
        Math.max(0, Math.min(encoderOptions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      encoderOptions[next].focus();
    } else if (event.key === 'Tab') {
      closeEncoderMenu(true);
    }
  });
}

document.addEventListener('pointerdown', (event) => {
  if (!$('encoderRow').contains(event.target)) closeEncoderMenu();
});

// ---------- feedback ----------

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}

const pendingLogs = [];
let logFrame = 0;
function log(line, cls) {
  pendingLogs.push([line, cls]);
  if (logFrame) return;
  logFrame = requestAnimationFrame(() => {
    const el = $('log');
    el.classList.remove('hidden');
    const fragment = document.createDocumentFragment();
    for (const [text, type] of pendingLogs.splice(0)) {
      const row = document.createElement('div');
      row.className = type || (/ERROR|error:/i.test(text) ? 'err' : '');
      row.textContent = text;
      fragment.appendChild(row);
    }
    el.appendChild(fragment);
    while (el.childElementCount > 300) el.firstElementChild.remove();
    el.scrollTop = el.scrollHeight;
    logFrame = 0;
  });
}
api.onLog((line) => log(line));

// ---------- tools ----------

function setTool(id, ok, message) {
  const tool = $(id);
  tool.classList.toggle('done', ok);
  tool.querySelector('.tool-state').textContent = message ?? (ok ? '✓ ' + tr('ready') : tr('missing'));
}

function renderStatus() {
  const ready = !!(toolStatus.version && toolStatus.ffmpeg);
  const checked = 'version' in toolStatus;
  $('dot').className = 'dot ' + (!checked ? '' : ready ? 'ok' : 'err');
  $('ver').textContent = !checked ? tr('checking') : toolStatus.version
    ? `${ready ? tr('ready') : tr('missing') + ' FFmpeg'} · yt-dlp ${toolStatus.version}`
    : tr('notInstalled');
  if (toolStatus.appVersion) $('appVersion').textContent = 'v' + toolStatus.appVersion;
  $('updateBtn').classList.toggle('hidden', !toolStatus.version);
  $('setup').classList.toggle('hidden', !checked || ready);
  $('main').classList.remove('hidden');
  $('goBtn').disabled = !ready || running;
  $('goBtn').title = ready ? '' : tr('installRequired');
  setTool('t-ytdlp', !!toolStatus.version);
  setTool('t-ffmpeg', !!toolStatus.ffmpeg,
    !toolStatus.ffmpeg && toolStatus.canInstallFfmpeg === false ? tr('manualInstall') : undefined);
}

function setFolder(value) {
  folder = value;
  $('folder').textContent = value;
  $('folder').title = value;
}

async function refresh() {
  toolStatus = await api.status();
  if (!folder) setFolder(toolStatus.downloads);
  renderStatus();
  if (toolStatus.ffmpeg && !detected) {
    detected = await api.encoders().catch(() => ({}));
    renderDetected();
    syncEncoderMenu();
  }
}

api.onInstallProgress(({ tag, pct, extracting }) => {
  const tool = $('t-' + tag);
  tool.querySelector('.fill').style.transform = `scaleX(${pct / 100})`;
  tool.querySelector('.tool-state').textContent = extracting ? tr('extracting') : pct.toFixed(0) + '%';
});

async function install(tag, fn) {
  const tool = $('t-' + tag);
  tool.classList.add('busy', 'running');
  try {
    await fn();
  } finally {
    tool.classList.remove('busy', 'running');
  }
}

$('installBtn').onclick = async () => {
  const button = $('installBtn');
  const label = button.querySelector('span');
  const taskLanguage = lang;
  button.disabled = true;
  label.textContent = tr('installing');
  try {
    if (!toolStatus.version) await install('ytdlp', () => api.installYtdlp(taskLanguage));
    if (!toolStatus.ffmpeg) await install('ffmpeg', () => api.installFfmpeg(taskLanguage));
    toast(tr('installSuccess'));
  } catch (error) {
    toast(tr('installFailed') + cleanError(error));
  } finally {
    await refresh().catch(() => {});
    button.disabled = false;
    label.textContent = tr('install');
  }
};

$('updateBtn').onclick = async () => {
  const button = $('updateBtn');
  const label = button.querySelector('.label-text');
  button.disabled = true;
  button.classList.add('spin');
  label.textContent = tr('updating');
  try {
    log(await api.updateYtdlp(lang));
    await refresh();
    toast(tr('updated'));
  } catch (error) {
    toast(tr('updateFailed') + cleanError(error));
  } finally {
    button.disabled = false;
    button.classList.remove('spin');
    label.textContent = tr('update');
  }
};

// ---------- options (remembered between sessions) ----------

function syncKind() {
  const audio = picked('kind') === 'audio';
  $('videoOpts').classList.toggle('hidden', audio);
  $('audioOpts').classList.toggle('hidden', !audio);
  $('outputOpts').classList.toggle('hidden', audio);
  $('encoderRow').classList.toggle('hidden', audio || picked('out') === 'original');
}

for (const name of ['kind', 'vq', 'aq', 'out']) {
  const saved = store.get('opt-' + name);
  const input = saved && document.querySelector(`input[name=${name}][value="${CSS.escape(saved)}"]`);
  if (input) input.checked = true;
  document.querySelectorAll(`input[name=${name}]`).forEach((radio) => radio.addEventListener('change', () => {
    store.set('opt-' + name, radio.value);
    syncKind();
  }));
}
const savedEncoder = store.get('encoder');
if (encoderOptions.some((option) => option.dataset.value === savedEncoder)) $('encoder').value = savedEncoder;
$('playlist').checked = store.get('playlist') === '1';
$('playlist').addEventListener('change', () => store.set('playlist', $('playlist').checked ? '1' : '0'));
syncKind();

// ---------- link field ----------

function setUrl(value) {
  $('url').value = value.trim();
  $('clearBtn').classList.toggle('hidden', !$('url').value);
  showUrlError('');
}

function showUrlError(message) {
  $('urlError').textContent = message;
  $('urlError').classList.toggle('hidden', !message);
  $('urlField').classList.remove('invalid');
  if (message) requestAnimationFrame(() => $('urlField').classList.add('invalid'));
}

$('url').addEventListener('input', () => setUrl($('url').value));
$('url').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !$('goBtn').disabled) $('goBtn').click();
});
$('clearBtn').onclick = () => { setUrl(''); $('url').focus(); };

$('pasteBtn').onclick = async () => {
  try {
    setUrl(await navigator.clipboard.readText());
    $('url').focus();
  } catch {
    toast(tr('clipboardFailed'));
  }
};

// วางลิงก์ได้จากทุกที่ในหน้าต่าง และลากลิงก์มาวางได้
document.addEventListener('paste', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const text = event.clipboardData?.getData('text') || '';
  if (!text.trim()) return;
  event.preventDefault();
  setUrl(text);
  $('url').focus();
});
document.addEventListener('dragover', (event) => {
  event.preventDefault();
  document.body.classList.add('dragging');
});
document.addEventListener('dragleave', (event) => {
  if (!event.relatedTarget) document.body.classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  event.preventDefault();
  document.body.classList.remove('dragging');
  const text = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text') || '';
  const link = text.split(/\r?\n/).find((line) => line && !line.startsWith('#'));
  if (link) setUrl(link);
});

$('pickBtn').onclick = async () => {
  const selected = await api.pickFolder();
  if (!selected) return;
  setFolder(selected);
  store.set('folder', selected);
};

$('openBtn').onclick = async () => {
  if (await api.openFolder(folder) === 'not-found') toast(tr('folderMissing'));
};

// ---------- progress ----------

function resetJobs() {
  $('phase').textContent = '';
  $('fill').style.width = '0%';
  $('pct').textContent = '0%';
  $('speed').textContent = '';
  $('eta').textContent = '';
  $('progress').classList.add('hidden');
  $('progress').classList.remove('show');
  $('result').classList.add('hidden');
}

function setJob(stage, { pct = 0, speed, eta, label, item, name }) {
  $('progress').classList.remove('hidden');
  $('progress').classList.add('show');
  $('phase').textContent = [label, name, item ? tr('item') + item : ''].filter(Boolean).join(' · ');
  $('fill').style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
  $('pct').textContent = pct > 0 ? pct.toFixed(1) + '%' : '';
  const known = (value) => value && !/^(Unknown|NA|N\/A)$/i.test(value);
  $('speed').textContent = known(speed) ? speed : '';
  $('eta').textContent = known(eta) ? tr('remaining') + eta : '';
}

function finishJobs(ok, cancelled = false) {
  $('phase').textContent = tr(ok ? 'finished' : cancelled ? 'cancelled' : 'failed');
  if (ok) { $('fill').style.width = '100%'; $('pct').textContent = '100%'; }
  $('speed').textContent = $('eta').textContent = '';
}

function showResult(type, title, detail) {
  const result = $('result');
  result.classList.remove('hidden', 'error');
  result.classList.toggle('error', type === 'error');
  $('resultSvg').innerHTML = type === 'error' ? '<path d="M12 7v6M12 16.5v.5"/>' : '<path d="m5 12.5 4.5 4.5L19 7.5"/>';
  $('resultTitle').textContent = title;
  $('resultDetail').textContent = detail;
  $('showBtn').classList.toggle('hidden', type !== 'ok' || !lastFiles.length);
  // เริ่มอนิเมชันใหม่ทุกครั้ง
  result.style.animation = 'none';
  void result.offsetWidth;
  result.style.animation = '';
  result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

api.onProgress((data) => setJob(data.stage || 'download', data));

$('showBtn').onclick = () => api.showFile(lastFiles[lastFiles.length - 1]);

function setRunning(value) {
  running = value;
  $('goBtn').classList.toggle('working', value);
  $('goText').textContent = tr(value ? 'downloading' : 'start');
  $('cancelBtn').classList.toggle('hidden', !value);
  $('cancelBtn').disabled = false;
  renderStatus();
}

$('goBtn').onclick = async () => {
  const url = $('url').value.trim();
  if (!url) return showUrlError(tr('urlRequired'));
  if (!/^https?:\/\/\S+$/i.test(url)) return showUrlError(tr('urlInvalid'));
  showUrlError('');

  const taskLanguage = lang;
  setRunning(true);
  resetJobs();
  $('progress').classList.remove('hidden');
  $('progress').classList.add('show');
  requestAnimationFrame(() => $('progress').scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  setJob('download', { label: tr('preparing') });
  $('log').replaceChildren();

  const kind = picked('kind');
  const quality = kind === 'audio' ? picked('aq') : picked('vq');
  try {
    const { code, files, error } = await api.download({
      url, kind, quality, folder, playlist: $('playlist').checked,
      encoder: $('encoder').value, output: picked('out'), language: taskLanguage,
    });
    lastFiles = files || [];
    const names = lastFiles.map((file) => file.split(/[\\/]/).pop());
    if (code === 0) {
      finishJobs(true);
      const more = names.length > 1 ? tr('andMore', { n: names.length - 1 }) : '';
      showResult('ok', names.length > 1 ? tr('savedMany', { n: names.length }) : tr('savedOne'), (names[0] || '') + more);
      log(tr('finished'), 'ok');
    } else if (code === -1) {
      finishJobs(false, true);
      showResult('error', tr('cancelled'), '');
    } else {
      finishJobs(false);
      showResult('error', tr('failed'), error || tr('failedHint'));
    }
  } catch (error) {
    finishJobs(false);
    showResult('error', tr('failed'), cleanError(error));
    log(cleanError(error), 'err');
  } finally {
    setRunning(false);
  }
};

$('cancelBtn').onclick = () => {
  $('cancelBtn').disabled = true;
  api.cancel();
};

// ---------- start ----------

if (folder) setFolder(folder);
applyLanguage();
if (!languageWasChosen) {
  window.framePortLanguage.detect().then((detectedLanguage) => {
    if (languageWasChosen || detectedLanguage === lang) return;
    lang = detectedLanguage;
    applyLanguage();
  }).catch(() => {});
}
refresh().catch((error) => {
  toolStatus = { version: null, ffmpeg: false };
  renderStatus();
  $('ver').textContent = cleanError(error);
});
