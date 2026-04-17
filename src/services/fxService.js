const FX_API_URL = process.env.FX_API_URL || 'https://api.fxratesapi.com/latest';
const FX_API_KEY = process.env.FX_API_KEY || '';
const FX_API_KEY_PARAM = process.env.FX_API_KEY_PARAM || 'api_key';
const FX_BASE_CURRENCY = process.env.FX_BASE_CURRENCY || 'USD';
const FX_TARGET_CURRENCY = process.env.FX_TARGET_CURRENCY || 'IDR';
const FX_TARGET_PARAM = process.env.FX_TARGET_PARAM || 'symbols';
const FX_TIMEOUT_MS = Number(process.env.FX_TIMEOUT_MS || 5000);

let cachedRate = null;
let cachedAt = 0;
const FX_CACHE_TTL_MS = Number(process.env.FX_CACHE_TTL_MS || 5 * 60 * 1000);
const FX_FAIL_CLOSE = (process.env.FX_FAIL_CLOSE || 'true') === 'true';

async function fetchUsdToIdrRate() {
  const now = Date.now();
  if (cachedRate && now - cachedAt < FX_CACHE_TTL_MS) {
    return { rate: cachedRate, source: 'cache' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FX_TIMEOUT_MS);

  try {
    const url = new URL(FX_API_URL);
    if (FX_API_KEY) {
      url.searchParams.set(FX_API_KEY_PARAM, FX_API_KEY);
    }
    url.searchParams.set('base', FX_BASE_CURRENCY);
    url.searchParams.set(FX_TARGET_PARAM, FX_TARGET_CURRENCY);

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`FX provider responded with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rate = Number(payload?.rates?.[FX_TARGET_CURRENCY]);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Invalid FX rate response payload');
    }

    cachedRate = rate;
    cachedAt = Date.now();
    return { rate, source: 'api' };
  } catch (error) {
    if (cachedRate && !FX_FAIL_CLOSE) {
      return { rate: cachedRate, source: 'stale_cache' };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchUsdToIdrRate };
