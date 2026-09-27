const $ = (id) => document.getElementById(id);
const picked = (name) => document.querySelector(`input[name=${name}]:checked`).value;

const words = {
  th: {
    appTitle: 'FramePort', appKicker: 'ดาวน์โหลดและแปลงไฟล์ในที่เดียว', checking: 'กำลังตรวจสอบ…',
    notInstalled: 'ยังไม่ได้ติดตั้ง', ffmpegReady: 'ffmpeg พร้อม', noFfmpeg: 'ไม่มี ffmpeg',
    setupTitle: 'เริ่มใช้งานครั้งแรก', setupDescription: 'ติดตั้งส่วนที่จำเป็นครั้งเดียว แล้วเริ่มดาวน์โหลดได้ทันที',
    ytdlpDescription: 'ตัวดาวน์โหลด · ~18 MB', ffmpegDescription: 'แปลงวิดีโอและเสียง · ~150 MB',
    headline: 'วางลิงก์ แล้วเลือกไฟล์', urlLabel: 'ลิงก์วิดีโอ',
    urlPlaceholder: 'วางลิงก์ YouTube, TikTok, Facebook…', paste: 'วางลิงก์',
    format: 'รูปแบบไฟล์', video: 'วิดีโอ MP4', audioOnly: 'เสียงอย่างเดียว',
    resolution: 'ความละเอียด', best: 'สูงสุด', available: 'ที่มี', smallFile: 'ไฟล์เล็ก',
    videoHint: 'MP4 (H.264 + AAC) · แปลง VP9/AV1/HEVC ตามวิธีที่เลือก',
    audioFormat: 'ไฟล์เสียง', smallPlay: 'ไฟล์เล็ก เปิดได้ทุกที่',
    lossless: 'ไม่เสียคุณภาพ', uncompressed: 'ไม่บีบอัด ไฟล์ใหญ่',
    saveTo: 'บันทึกที่', choose: 'เปลี่ยน', open: 'เปิด',
    encoderLabel: 'ตัวเข้ารหัสวิดีโอ', auto: 'อัตโนมัติ · ลองใช้ GPU ที่พร้อม',
    encoderAutoDesc: 'ลองใช้ตัวเข้ารหัส GPU ที่รองรับก่อน', recommended: 'แนะนำ',
    encoderNvidiaDesc: 'เข้ารหัสด้วยการ์ดจอ NVIDIA', encoderIntelDesc: 'กราฟิก Intel ในตัวหรือ Arc',
    encoderAmdDesc: 'กราฟิก AMD ในตัวหรือ Radeon', encoderHybridDesc: 'แบ่งงานระหว่าง CPU และ GPU',
    hybrid: 'CPU ถอดรหัส + GPU เข้ารหัส', hybridBadge: 'ผสม', encoderCpuDesc: 'เข้ารหัสด้วย CPU รองรับได้กว้าง',
    playlist: 'ดาวน์โหลดทั้งเพลย์ลิสต์',
    start: 'เริ่มดาวน์โหลด', cancel: 'ยกเลิก', update: 'อัปเดต yt-dlp',
    updateTitle: 'อัปเดต yt-dlp', install: 'ติดตั้งเครื่องมือ',
    installRequired: 'ติดตั้ง yt-dlp และ ffmpeg ก่อนดาวน์โหลด',
    ready: 'พร้อมใช้งาน', missing: 'ยังไม่มี', manualInstall: 'ติดตั้งเองจากแพ็กเกจ',
    installing: 'กำลังติดตั้ง…', extracting: 'กำลังแตกไฟล์…',
    installSuccess: 'ติดตั้งเรียบร้อย พร้อมใช้งาน', installFailed: 'ติดตั้งไม่สำเร็จ: ',
    updating: 'กำลังอัปเดต…', updateFailed: 'อัปเดตไม่สำเร็จ: ',
    clipboardFailed: 'อ่านคลิปบอร์ดไม่ได้ วางลิงก์ด้วย Ctrl+V',
    urlRequired: 'วางลิงก์ก่อนนะ', downloading: 'กำลังดาวน์โหลด…',
    starting: 'กำลังเริ่ม…', finished: 'เสร็จแล้ว ✓', cancelled: 'ยกเลิกแล้ว',
    failed: 'ไม่สำเร็จ', failedDetail: 'ดาวน์โหลดไม่สำเร็จ ดูรายละเอียดด้านล่าง',
    remaining: 'เหลือ ', switchLanguage: 'เปลี่ยนภาษา',
    toggleTheme: 'สลับธีมสี', darkTheme: 'มืด', lightTheme: 'สว่าง',
    details: 'รายละเอียดการทำงาน',
  },
  en: {
    appTitle: 'FramePort', appKicker: 'Downloads, ready when you are', checking: 'Checking tools…',
    notInstalled: 'Not installed', ffmpegReady: 'FFmpeg ready', noFfmpeg: 'FFmpeg missing',
    setupTitle: 'Set up for first use', setupDescription: 'Install the required tools once, then start downloading.',
    ytdlpDescription: 'Downloader · ~18 MB', ffmpegDescription: 'Video and audio conversion · ~150 MB',
    headline: 'Paste a link and choose a format', urlLabel: 'Video link',
    urlPlaceholder: 'Paste a YouTube, TikTok, or Facebook link…', paste: 'Paste',
    format: 'Format', video: 'MP4 video', audioOnly: 'Audio only',
    resolution: 'Resolution', best: 'Best', available: 'available', smallFile: 'Smaller file',
    videoHint: 'MP4 (H.264 + AAC) · VP9/AV1/HEVC sources are converted using the selected mode',
    audioFormat: 'Audio format', smallPlay: 'Small file · plays anywhere',
    lossless: 'Lossless', uncompressed: 'Uncompressed · large',
    saveTo: 'Save to', choose: 'Choose…', open: 'Open',
    encoderLabel: 'Video encoder', auto: 'Automatic · try available GPU',
    encoderAutoDesc: 'Try a supported GPU encoder first', recommended: 'RECOMMENDED',
    encoderNvidiaDesc: 'Encode with an NVIDIA graphics card', encoderIntelDesc: 'Intel integrated graphics or Arc',
    encoderAmdDesc: 'AMD integrated graphics or Radeon', encoderHybridDesc: 'Split work between the CPU and GPU',
    hybrid: 'CPU decode + GPU encode', hybridBadge: 'HYBRID', encoderCpuDesc: 'Software encode with broad compatibility',
    playlist: 'Download entire playlist',
    start: 'Download', cancel: 'Cancel', update: 'Update yt-dlp',
    updateTitle: 'Update yt-dlp', install: 'Install tools',
    installRequired: 'Install yt-dlp and FFmpeg before downloading',
    ready: 'Ready', missing: 'Missing', manualInstall: 'Install from package manager',
    installing: 'Installing…', extracting: 'Extracting…',
    installSuccess: 'Installation complete', installFailed: 'Installation failed: ',
    updating: 'Updating…', updateFailed: 'Update failed: ',
    clipboardFailed: 'Cannot read clipboard. Paste with Ctrl+V.',
    urlRequired: 'Paste a link first', downloading: 'Downloading…',
    starting: 'Starting…', finished: 'Complete ✓', cancelled: 'Cancelled',
    failed: 'Failed', failedDetail: 'Download failed. See details below.',
    remaining: 'Remaining ', switchLanguage: 'Switch language',
    toggleTheme: 'Toggle color theme', darkTheme: 'Dark', lightTheme: 'Light',
    details: 'Activity details',
  },
};

let lang = localStorage.getItem('language') === 'en' ? 'en' : 'th';
let theme = localStorage.getItem('theme') ||
  (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let folder = localStorage.getItem('folder');
let toolStatus = {};

function tr(key) {
  return words[lang][key] ?? words.th[key] ?? key;
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  $('themeBtn').textContent = tr(dark ? 'lightTheme' : 'darkTheme');
  $('themeBtn').setAttribute('aria-pressed', String(dark));
  $('themeBtn').setAttribute('aria-label', tr('toggleTheme'));
}

function applyLanguage() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = tr(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = tr(el.dataset.i18nPlaceholder);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    el.title = tr(el.dataset.i18nTitle);
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', tr(el.dataset.i18nAria));
  }
  $('langBtn').textContent = lang === 'th' ? 'EN' : 'ไทย';
  $('langBtn').setAttribute('aria-label', tr('switchLanguage'));
  $('updateBtn').textContent = tr('update');
  $('installBtn').textContent = tr('install');
  applyTheme();
  syncEncoderMenu();
  renderStatus();
}

const encoderOptions = [...document.querySelectorAll('.encoder-option')];

function syncEncoderMenu() {
  const selected = encoderOptions.find((option) => option.dataset.value === $('encoder').value) || encoderOptions[0];
  $('encoderValue').textContent = selected.querySelector('.encoder-option-title').textContent;
  $('encoderDescription').textContent = selected.querySelector('.encoder-option-description').textContent;
  for (const option of encoderOptions) {
    const active = option === selected;
    option.setAttribute('aria-selected', String(active));
    option.querySelector('.encoder-check').textContent = active ? '✓' : '';
  }
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
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
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

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 2500);
}

function log(line, cls) {
  const el = $('log');
  el.classList.remove('hidden');
  const row = document.createElement('div');
  if (cls) row.className = cls;
  else if (/ERROR|error:/i.test(line)) row.className = 'err';
  row.textContent = line;
  el.appendChild(row);
  while (el.childElementCount > 300) el.firstElementChild.remove();
  el.scrollTop = el.scrollHeight;
}

function setTool(id, ok, message) {
  const tool = $(id);
  tool.classList.toggle('done', ok);
  tool.querySelector('.dot').className = 'dot ' + (ok ? 'ok' : 'err');
  tool.querySelector('.tool-state').textContent = message ?? (ok ? tr('ready') : tr('missing'));
}

function renderStatus() {
  const ready = !!(toolStatus.version && toolStatus.ffmpeg);
  $('dot').className = 'dot ' + (ready ? 'ok' : 'err');
  $('ver').textContent = toolStatus.version
    ? `yt-dlp ${toolStatus.version} · ${toolStatus.ffmpeg ? tr('ffmpegReady') : tr('noFfmpeg')}`
    : tr('notInstalled');
  $('updateBtn').classList.toggle('hidden', !toolStatus.version);
  $('setup').classList.toggle('hidden', ready);
  $('main').classList.remove('hidden');
  $('goBtn').disabled = !ready;
  $('goBtn').title = ready ? '' : tr('installRequired');
  setTool('t-ytdlp', !!toolStatus.version);
  setTool('t-ffmpeg', !!toolStatus.ffmpeg,
    !toolStatus.ffmpeg && !toolStatus.canInstallFfmpeg ? tr('manualInstall') : undefined);
}

async function refresh() {
  toolStatus = await api.status();
  if (!folder) folder = toolStatus.downloads;
  $('folder').textContent = folder;
  $('folder').title = folder;
  renderStatus();
}

$('langBtn').onclick = () => {
  lang = lang === 'th' ? 'en' : 'th';
  localStorage.setItem('language', lang);
  applyLanguage();
};

$('themeBtn').onclick = () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  applyTheme();
};

api.onInstallProgress(({ tag, pct, extracting }) => {
  const tool = $('t-' + tag);
  tool.querySelector('.fill').style.width = pct + '%';
  tool.querySelector('.tool-state').textContent = extracting ? tr('extracting') : pct.toFixed(0) + '%';
});

async function install(tag, fn) {
  const tool = $('t-' + tag);
  tool.classList.add('busy');
  try {
    await fn();
  } finally {
    tool.classList.remove('busy');
  }
}

$('installBtn').onclick = async () => {
  const button = $('installBtn');
  const taskLanguage = lang;
  button.disabled = true;
  button.textContent = tr('installing');
  try {
    if (!toolStatus.version) await install('ytdlp', () => api.installYtdlp(taskLanguage));
    if (!toolStatus.ffmpeg) await install('ffmpeg', () => api.installFfmpeg(taskLanguage));
    toast(tr('installSuccess'));
  } catch (error) {
    toast(tr('installFailed') + error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  } finally {
    await refresh().catch(() => {});
    button.disabled = false;
    button.textContent = tr('install');
  }
};

$('updateBtn').onclick = async () => {
  const button = $('updateBtn');
  button.disabled = true;
  button.textContent = tr('updating');
  try {
    log(await api.updateYtdlp());
    await refresh();
  } catch (error) {
    toast(tr('updateFailed') + error.message);
  } finally {
    button.disabled = false;
    button.textContent = tr('update');
  }
};

document.querySelectorAll('input[name="kind"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const audio = picked('kind') === 'audio';
    $('videoOpts').classList.toggle('hidden', audio);
    $('audioOpts').classList.toggle('hidden', !audio);
    $('encoderRow').classList.toggle('hidden', audio);
  });
});

$('pasteBtn').onclick = async () => {
  try {
    $('url').value = (await navigator.clipboard.readText()).trim();
    $('url').focus();
  } catch {
    toast(tr('clipboardFailed'));
  }
};

$('pickBtn').onclick = async () => {
  const selected = await api.pickFolder();
  if (!selected) return;
  folder = selected;
  localStorage.setItem('folder', selected);
  $('folder').textContent = selected;
  $('folder').title = selected;
};

$('openBtn').onclick = () => api.openFolder(folder);

$('url').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') $('goBtn').click();
});

api.onProgress(({ pct, speed, eta, label }) => {
  if (label) $('phase').textContent = label;
  $('fill').style.width = pct + '%';
  $('pct').textContent = pct.toFixed(1) + '%';
  $('speed').textContent = speed && speed !== 'Unknown' ? speed : '';
  $('eta').textContent = eta && eta !== 'Unknown' ? tr('remaining') + eta : '';
});

const pendingLogs = [];
let logFrame = 0;
api.onLog((line) => {
  pendingLogs.push(line);
  if (logFrame) return;
  logFrame = requestAnimationFrame(() => {
    const el = $('log');
    const fragment = document.createDocumentFragment();
    for (const text of pendingLogs.splice(0)) {
      const row = document.createElement('div');
      if (/ERROR|error:/i.test(text)) row.className = 'err';
      row.textContent = text;
      fragment.appendChild(row);
    }
    el.classList.remove('hidden');
    el.appendChild(fragment);
    while (el.childElementCount > 300) el.firstElementChild.remove();
    el.scrollTop = el.scrollHeight;
    logFrame = 0;
  });
});

$('goBtn').onclick = async () => {
  const url = $('url').value.trim();
  if (!url) return toast(tr('urlRequired'));

  const button = $('goBtn');
  const taskLanguage = lang;
  button.disabled = true;
  button.textContent = tr('downloading');
  $('cancelBtn').classList.remove('hidden');
  $('progress').classList.add('show');
  $('fill').style.width = '0%';
  $('pct').textContent = '0%';
  $('speed').textContent = $('eta').textContent = '';
  $('phase').textContent = tr('starting');
  $('log').innerHTML = '';

  const kind = picked('kind');
  const quality = kind === 'audio' ? picked('aq') : picked('vq');
  try {
    const code = await api.download({
      url, kind, quality, folder, playlist: $('playlist').checked,
      encoder: $('encoder').value, language: taskLanguage,
    });
    if (code === 0) {
      $('fill').style.width = '100%';
      $('pct').textContent = '100%';
      $('phase').textContent = tr('finished');
      log(tr('finished'), 'ok');
      toast(tr('finished'));
    } else if (code === -1) {
      $('phase').textContent = tr('cancelled');
    } else {
      $('phase').textContent = tr('failed');
      toast(tr('failedDetail'));
    }
  } catch (error) {
    $('phase').textContent = tr('failed');
    log(error.message, 'err');
  } finally {
    button.disabled = false;
    button.textContent = tr('start');
    $('cancelBtn').classList.add('hidden');
  }
};

$('cancelBtn').onclick = () => {
  api.cancel();
  toast(tr('cancelled'));
};

applyLanguage();
refresh().catch((error) => {
  $('ver').textContent = error.message;
  $('dot').className = 'dot err';
});
