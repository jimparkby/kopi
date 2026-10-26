import { useEffect, useState } from 'react';

export const FALLBACK = { BTC: 200850, ETH: 8206, usd: 3.01, src: 'Оценка курса', live: false };

const getJson = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/** Живые курсы BTC/ETH в BYN и USD/BYN. Сначала свой прокси (/api/rates), затем публичные API. */
export async function fetchRates() {
  try {
    const r = await getJson('/api/rates');
    if (r && r.BTC > 0 && r.ETH > 0 && r.usd > 0) return r;
  } catch (e) { /* прокси недоступен, например в vite dev */ }

  const usdP = getJson('https://api.nbrb.by/exrates/rates/USD?parammode=2')
    .then((x) => x.Cur_OfficialRate)
    .catch(() => null);
  try {
    const [c, u] = await Promise.all([
      getJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'),
      usdP,
    ]);
    const usd = u || FALLBACK.usd;
    if (c.bitcoin && c.ethereum) {
      return { BTC: c.bitcoin.usd * usd, ETH: c.ethereum.usd * usd, usd, src: 'Live · CoinGecko', live: true };
    }
  } catch (e) { /* офлайн */ }
  return null;
}

/** Опрос курсов раз в 15 секунд, пока вкладка видима. */
export function useRates(onFirstLive) {
  const [rates, setRates] = useState(null);
  useEffect(() => {
    let alive = true;
    let first = true;
    const tick = async () => {
      const r = await fetchRates();
      if (!alive || !r) return;
      setRates(r);
      if (first) {
        first = false;
        onFirstLive?.(r);
      }
    };
    tick();
    const iv = setInterval(() => { if (!document.hidden) tick(); }, 15000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rates;
}
