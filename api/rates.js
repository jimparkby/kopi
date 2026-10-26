// Vercel Serverless Function: живые курсы BTC/ETH в BYN и официальный USD/BYN НБРБ.
// Браузер ходит сюда, а не в биржевые API напрямую: нет проблем с CORS и лимитами.

const getJson = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(4500), headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
};

async function nbrbUsd() {
  try {
    const x = await getJson('https://api.nbrb.by/exrates/rates/USD?parammode=2');
    return x.Cur_OfficialRate || null;
  } catch (e) {
    return null;
  }
}

async function fromDzengi(usd) {
  const t = await Promise.all(
    ['BTC/BYN', 'ETH/BYN'].map((s) =>
      getJson('https://api-adapter.dzengi.com/api/v2/ticker/24hr?symbol=' + encodeURIComponent(s)),
    ),
  );
  const BTC = (+t[0].bidPrice + +t[0].askPrice) / 2;
  const ETH = (+t[1].bidPrice + +t[1].askPrice) / 2;
  if (!(BTC > 0 && ETH > 0)) throw new Error('dzengi: empty');
  return { BTC, ETH, usd: usd || 3.01, src: 'Live · Dzengi', live: true };
}

async function fromCoinGecko(usd) {
  const c = await getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
  if (!usd || !c.bitcoin || !c.ethereum) throw new Error('coingecko: empty');
  return { BTC: c.bitcoin.usd * usd, ETH: c.ethereum.usd * usd, usd, src: 'Live · CoinGecko', live: true };
}

export default async function handler(req, res) {
  const usd = await nbrbUsd();
  for (const source of [fromDzengi, fromCoinGecko]) {
    try {
      const data = await source(usd);
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
      return res.status(200).json(data);
    } catch (e) {
      // пробуем следующий источник
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'rates unavailable' });
}
