const fs = require('node:fs/promises');
const path = require('node:path');

const RATE_LIMIT_ERROR = /HTTP Error 403:\s*rate limit exceeded/i;

async function updateYtdlp({ bin, localBin, capture, downloadLatest, language = 'th' }) {
  try {
    return (await capture(bin, ['-U'])).trim();
  } catch (error) {
    if (!RATE_LIMIT_ERROR.test(String(error?.message || error))) throw error;

    const tmp = `${localBin}.update.part`;
    await fs.mkdir(path.dirname(localBin), { recursive: true });
    try {
      await downloadLatest(tmp);
      await fs.rename(tmp, localBin);
    } finally {
      await fs.rm(tmp, { force: true });
    }

    return language === 'en'
      ? 'Updated yt-dlp directly after the GitHub API rate limit.'
      : 'อัปเดต yt-dlp ผ่านลิงก์ดาวน์โหลดโดยตรง เนื่องจาก GitHub API เต็มโควตา';
  }
}

module.exports = { updateYtdlp };
