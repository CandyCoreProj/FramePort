const fs = require('node:fs');
const path = require('node:path');

function key(file) {
  const value = path.resolve(file);
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

function reserveVersionedPath({ folder, downloadedPath, finalExtension, reserved = new Set() }) {
  const sourceExtension = path.extname(downloadedPath);
  const title = path.basename(downloadedPath, sourceExtension);

  for (let version = 1; ; version++) {
    const suffix = version === 1 ? '' : ` ${version}`;
    const destination = path.join(folder, `${title}${suffix}${sourceExtension}`);
    const finalPath = path.join(folder, `${title}${suffix}${finalExtension}`);
    const keys = [key(destination), key(finalPath)];
    if (keys.some((item) => reserved.has(item)) || fs.existsSync(destination) || fs.existsSync(finalPath)) continue;
    keys.forEach((item) => reserved.add(item));
    return { path: destination, finalPath, version };
  }
}

module.exports = { reserveVersionedPath };
