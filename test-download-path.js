const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { reserveVersionedPath } = require('./download-path');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'frameport-output-path-'));
try {
  const reserved = new Set();
  const first = reserveVersionedPath({
    folder,
    downloadedPath: path.join(folder, '.frameport-temp', 'Clip.webm'),
    finalExtension: '.mp4',
    reserved,
  });
  assert.equal(first.version, 1);
  assert.equal(first.path, path.join(folder, 'Clip.webm'));

  const second = reserveVersionedPath({
    folder,
    downloadedPath: path.join(folder, '.frameport-temp', 'Clip.webm'),
    finalExtension: '.mp4',
    reserved,
  });
  assert.equal(second.version, 2, 'a second same-title download becomes another version');
  assert.equal(second.path, path.join(folder, 'Clip 2.webm'));

  fs.writeFileSync(path.join(folder, 'Movie.mp4'), 'existing converted file');
  const convertedCollision = reserveVersionedPath({
    folder,
    downloadedPath: path.join(folder, '.frameport-temp', 'Movie.webm'),
    finalExtension: '.mp4',
  });
  assert.equal(convertedCollision.version, 2, 'reserve the converted extension too');
  assert.equal(convertedCollision.path, path.join(folder, 'Movie 2.webm'));
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
