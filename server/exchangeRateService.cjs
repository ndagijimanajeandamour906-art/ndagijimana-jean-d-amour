const crypto = require('node:crypto');

const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function createExchangeRateService({ db, fetchFn = fetch, now = () => Date.now() }) {
  async function getUsdRates({ forceRefresh = false } = {}) {
    const nowMs = now();
    const cachedRows = db
      .prepare("SELECT target_currency, rate, source, fetched_at, expires_at FROM exchange_rates WHERE base_currency = 'USD'")
      .all();

    const validCached = cachedRows.filter((r) => new Date(r.expires_at).getTime() > nowMs);
    if (!forceRefresh && validCached.length > 0) {
      const ratesMap = { USD: 1 };
      for (const r of validCached) {
        ratesMap[r.target_currency] = Number(r.rate);
      }
      return {
        ok: true,
        baseCurrency: 'USD',
        rates: ratesMap,
        source: validCached[0].source,
        fetchedAt: validCached[0].fetched_at,
        cached: true,
      };
    }

    const apiUrl = (process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD').trim();
    const apiKey = (process.env.EXCHANGE_RATE_API_KEY || '').trim();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
      const res = await fetchFn(apiUrl, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`FX provider responded with status ${res.status}`);
      }
      const data = await res.json();
      const rawRates = data?.rates || data?.conversion_rates;
      if (!rawRates || typeof rawRates !== 'object') {
        throw new Error('Invalid response structure from exchange rate provider');
      }

      const activeCurrencies = db
        .prepare('SELECT code FROM currencies WHERE is_active = 1')
        .all()
        .map((c) => c.code);

      const nowIso = new Date(nowMs).toISOString();
      const expiresIso = new Date(nowMs + FX_CACHE_TTL_MS).toISOString();
      const sourceLabel = data?.provider || apiUrl.replace(/^https?:\/\//, '').split('/')[0] || 'verified-fx-api';

      const upsert = db.prepare(`
        INSERT INTO exchange_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at)
        VALUES (?, 'USD', ?, ?, ?, ?, ?)
        ON CONFLICT(base_currency, target_currency) DO UPDATE SET
          rate = excluded.rate,
          source = excluded.source,
          fetched_at = excluded.fetched_at,
          expires_at = excluded.expires_at
      `);

      const ratesOut = { USD: 1 };
      for (const code of activeCurrencies) {
        if (code === 'USD') continue;
        const rateNum = Number(rawRates[code]);
        if (Number.isFinite(rateNum) && rateNum > 0) {
          upsert.run(`fx_USD_${code}`, code, rateNum, sourceLabel, nowIso, expiresIso);
          ratesOut[code] = rateNum;
        }
      }

      return {
        ok: true,
        baseCurrency: 'USD',
        rates: ratesOut,
        source: sourceLabel,
        fetchedAt: nowIso,
        cached: false,
      };
    } catch (err) {
      // If a previously fetched real FX rate exists in the database, return it marked stale rather than inventing a rate
      if (cachedRows.length > 0) {
        const ratesMap = { USD: 1 };
        for (const r of cachedRows) {
          ratesMap[r.target_currency] = Number(r.rate);
        }
        return {
          ok: true,
          baseCurrency: 'USD',
          rates: ratesMap,
          source: `${cachedRows[0].source} (last verified cache)`,
          fetchedAt: cachedRows[0].fetched_at,
          cached: true,
          stale: true,
        };
      }
      return {
        ok: false,
        code: 'EXCHANGE_RATE_UNAVAILABLE',
        error: `Verified exchange rates unavailable: ${err?.message || 'FX upstream unreachable'}`,
        rates: { USD: 1 },
      };
    }
  }

  async function convertFromUsd(amountUsd, targetCurrency) {
    const code = String(targetCurrency || 'USD').toUpperCase();
    if (code === 'USD') {
      return {
        ok: true,
        currency: 'USD',
        amount: Number(Number(amountUsd).toFixed(2)),
        amountUsd: Number(Number(amountUsd).toFixed(4)),
        rate: 1,
        source: 'USD base',
      };
    }

    const fx = await getUsdRates();
    if (!fx.ok || !fx.rates[code]) {
      return {
        ok: false,
        code: 'EXCHANGE_RATE_UNAVAILABLE',
        error: fx.error || `Verified exchange rate for ${code} is currently unavailable.`,
      };
    }

    const currRow = db.prepare('SELECT decimals FROM currencies WHERE code = ?').get(code);
    const decimals = currRow ? Number(currRow.decimals) : 2;
    const rate = Number(fx.rates[code]);
    const converted = Number((Number(amountUsd) * rate).toFixed(decimals));

    return {
      ok: true,
      currency: code,
      amount: converted,
      amountUsd: Number(Number(amountUsd).toFixed(4)),
      rate,
      source: fx.source,
      fetchedAt: fx.fetchedAt,
    };
  }

  async function convertToUsd(amount, sourceCurrency) {
    const code = String(sourceCurrency || 'USD').toUpperCase();
    if (code === 'USD') {
      return {
        ok: true,
        amountUsd: Number(Number(amount).toFixed(4)),
        rate: 1,
        source: 'USD base',
      };
    }
    const fx = await getUsdRates();
    if (!fx.ok || !fx.rates[code]) {
      return {
        ok: false,
        code: 'EXCHANGE_RATE_UNAVAILABLE',
        error: fx.error || `Cannot verify USD conversion rate for ${code}.`,
      };
    }
    const rate = Number(fx.rates[code]);
    return {
      ok: true,
      amountUsd: Number((Number(amount) / rate).toFixed(4)),
      rate,
      source: fx.source,
    };
  }

  return {
    getUsdRates,
    convertFromUsd,
    convertToUsd,
  };
}

module.exports = {
  createExchangeRateService,
};
