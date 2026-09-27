const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('docs/language.js', 'utf8');

function setup({ locale = 'en-US', timezone = 'UTC', countryCode, fail = false }) {
  const values = new Map();
  let requests = 0;
  const context = {
    window: {},
    navigator: { language: locale },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: timezone }) }) },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    fetch: async () => {
      requests++;
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => ({ success: true, country_code: countryCode }) };
    },
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
  };
  vm.runInNewContext(source, context);
  return { detect: () => context.window.framePortLanguage.detect(), values, requests: () => requests };
}

async function main() {
  const thailand = setup({ countryCode: 'th' });
  assert.equal(await thailand.detect(), 'th');
  assert.equal(await thailand.detect(), 'th');
  assert.equal(thailand.requests(), 1, 'a cached country should avoid a second request');

  assert.equal(await setup({ countryCode: 'US', timezone: 'Asia/Bangkok' }).detect(), 'en');
  assert.equal(await setup({ fail: true, timezone: 'Asia/Bangkok' }).detect(), 'th');
  assert.equal(await setup({ fail: true }).detect(), 'en');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
