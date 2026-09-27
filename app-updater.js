const { app, shell } = require('electron');

const RELEASES_URL = 'https://github.com/ArmZOfficial/FramePort/releases/latest';
const CHECK_EVERY = 4 * 60 * 60 * 1000;

// อัปเดตตัวโปรแกรมจาก GitHub Releases: ตัวติดตั้งดาวน์โหลดเบื้องหลังแล้วรอรีสตาร์ต
// ส่วนตัว portable อัปเดตตัวเองไม่ได้ จึงแจ้งเตือนและเปิดหน้าดาวน์โหลดแทน
function startAppUpdates(send) {
  let state = null;
  let ready = false;
  const publish = (next) => { state = next; send('app-update', state); };

  if (app.isPackaged) {
    const { autoUpdater } = require('electron-updater');
    const portable = !!process.env.PORTABLE_EXECUTABLE_FILE;
    autoUpdater.autoDownload = !portable;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', ({ version }) => publish({ state: portable ? 'available' : 'downloading', version }));
    autoUpdater.on('update-downloaded', ({ version }) => { ready = true; publish({ state: 'ready', version }); });
    autoUpdater.on('error', (error) => console.error('App update failed:', error?.message || error));
    const check = () => autoUpdater.checkForUpdates().catch(() => {});
    check();
    setInterval(check, CHECK_EVERY).unref();

    return {
      state: () => state,
      install() {
        if (ready) {
          setImmediate(() => autoUpdater.quitAndInstall(false, true));
          return 'restarting';
        }
        shell.openExternal(RELEASES_URL);
        return 'opened';
      },
    };
  }

  return { state: () => state, install: () => 'unavailable' };
}

module.exports = { startAppUpdates };
