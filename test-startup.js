const { app } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataPath = path.join(os.tmpdir(), `frameport-startup-${process.pid}`);
app.setPath('userData', userDataPath);
app.on('will-quit', () => fs.rmSync(userDataPath, { recursive: true, force: true }));

const errors = [];
const timeout = setTimeout(() => {
  console.error('Startup test timed out before the UI finished loading');
  app.exit(1);
}, 10000);

app.on('browser-window-created', (_event, win) => {
  win.show = () => {};
  win.webContents.on('console-message', (details) => {
    if (details.level === 'error') errors.push(`${details.sourceId}:${details.lineNumber} ${details.message}`);
  });
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    errors.push(`Load failed ${code}: ${description} (${url})`);
  });
  win.webContents.once('did-finish-load', async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ui = await win.webContents.executeJavaScript(`(() => {
      const main = document.querySelector('#main');
      return {
        mainVisible: !!main && getComputedStyle(main).display !== 'none',
        languageLoaded: !!window.framePortLanguage,
        preloadLoaded: !!window.api,
        rendererLoaded: !!document.querySelector('#langBtn').onclick,
      };
    })()`);
    clearTimeout(timeout);
    if (!ui.mainVisible || !ui.languageLoaded || !ui.preloadLoaded || !ui.rendererLoaded || errors.length) {
      console.error(JSON.stringify({ error: 'Startup UI failed', ui, rendererErrors: errors }));
      app.exit(1);
      return;
    }
    console.log('Startup UI visible');
    app.exit(0);
  });
});

require('./main');
