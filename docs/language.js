(() => {
  const cacheKey = 'frameport-ip-country';
  const day = 24 * 60 * 60 * 1000;

  function fallback() {
    const language = (navigator.language || '').toLowerCase();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return language.startsWith('th') || timezone === 'Asia/Bangkok' ? 'th' : 'en';
  }

  async function countryCode() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (cached?.expiresAt > Date.now() &&
          (cached.countryCode === null || /^[A-Z]{2}$/.test(cached.countryCode))) return cached.countryCode;
    } catch (_) {}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    let code = null;
    try {
      const response = await fetch('https://ipwho.is/?fields=success,country_code', {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (response.ok) {
        const result = await response.json();
        const candidate = typeof result.country_code === 'string' ? result.country_code.toUpperCase() : '';
        if (result.success === true && /^[A-Z]{2}$/.test(candidate)) code = candidate;
      }
    } catch (_) {
      // Use the device language and timezone when the lookup is unavailable.
    } finally {
      clearTimeout(timeout);
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ countryCode: code, expiresAt: Date.now() + (code ? day : day / 12) }));
    } catch (_) {}
    return code;
  }

  window.framePortLanguage = {
    fallback,
    async detect() {
      const country = await countryCode();
      return country ? (country === 'TH' ? 'th' : 'en') : fallback();
    },
  };
})();
