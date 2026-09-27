const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { updateYtdlp } = require('./ytdlp-updater');

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'frameport-ytdlp-update-'));
  try {
    const localBin = path.join(dir, 'yt-dlp.exe');
    await fs.writeFile(localBin, 'old version');
    let downloaded = false;

    const result = await updateYtdlp({
      bin: localBin,
      localBin,
      capture: async (_bin, args) => {
        assert.deepEqual(args, ['-U']);
        throw new Error('ERROR: Unable to obtain version info (HTTP Error 403: rate limit exceeded)');
      },
      downloadLatest: async (tmp) => {
        downloaded = true;
        await fs.writeFile(tmp, 'latest version');
      },
      language: 'en',
    });

    assert.equal(downloaded, true, 'rate-limit errors should use the direct latest-release download');
    assert.equal(await fs.readFile(localBin, 'utf8'), 'latest version');
    assert.match(result, /rate limit/i);

    let fetched = false;
    const normal = await updateYtdlp({
      bin: localBin,
      capture: async () => 'yt-dlp is up to date',
      downloadLatest: async () => { fetched = true; },
    });
    assert.equal(normal, 'yt-dlp is up to date');
    assert.equal(fetched, false, 'successful self-updates should not download again');

    await assert.rejects(updateYtdlp({
      bin: localBin,
      capture: async () => { throw new Error('network offline'); },
      downloadLatest: async () => assert.fail('non-rate-limit errors must not trigger fallback'),
    }), /network offline/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
