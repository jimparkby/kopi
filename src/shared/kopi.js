import { useCallback, useEffect, useState } from 'react';
import { roundUp } from './format.js';

// Связка KOPI — одна на оба приложения: Альфа Банк списывает сдачу с карты,
// WhiteBird сразу покупает на неё криптовалюту. Хранится отдельно и пишется только после действий пользователя.
export const KOPI_KEY = 'kopi.link.v1';
export const KOPI_COINS = ['BTC', 'ETH', 'USDT'];
export const KOPI_INFO = {
  BTC: { code: 'BTC', name: 'Bitcoin', sym: '₿', bg: '#F7931A', risk: 'Высокий риск', desc: 'Высокий риск, высокий потенциал', dp: 8 },
  ETH: { code: 'ETH', name: 'Ethereum', sym: 'Ξ', bg: '#627EEA', risk: 'Средний риск', desc: 'Вторая криптовалюта по капитализации', dp: 6 },
  USDT: { code: 'USDT', name: 'Tether', sym: '₮', bg: '#26A17B', risk: 'Привязан к $', desc: 'Стейблкоин, привязан к доллару', dp: 4 },
};

export const freshKopi = () => ({ v: 1, linked: false, card: '7781', step: 100, mult: 1, asset: 'BTC', ops: [] });

/** Цена монеты в BYN. */
export const kopiPrice = (R, a) => (a === 'USDT' ? R.usd : R[a]);

/** Сколько сдачи уйдёт в KOPI с покупки на сумму a (в копейках). Без подключения — ноль. */
export const kopiRound = (k, a) => (k.linked ? roundUp(a, k.step, k.mult) : 0);

/** Операция KOPI: сдача с карты Альфы → перевод в WhiteBird → покупка монеты по текущему курсу. */
export function kopiOp(k, R, merchant, a, t) {
  const up = kopiRound(k, a);
  if (!up) return null;
  const rate = kopiPrice(R, k.asset);
  return { id: 'k' + t, t, merchant, a, rounded: Math.ceil(a / k.step) * k.step, roundup: up, asset: k.asset, qty: up / 100 / rate, rate };
}

/** Монеты, купленные через KOPI, и сколько BYN на них ушло. */
export function kopiHold(k) {
  const h = Object.fromEntries(KOPI_COINS.map((a) => [a, { qty: 0, cost: 0 }]));
  k.ops.forEach((o) => {
    h[o.asset].qty += o.qty;
    h[o.asset].cost += o.roundup;
  });
  return h;
}

/** Стоимость портфеля KOPI по живому курсу (копейки BYN) и доходность. */
export function kopiValue(k, R) {
  const h = kopiHold(k);
  const val = (a) => Math.round(h[a].qty * kopiPrice(R, a) * 100);
  const value = KOPI_COINS.reduce((t, a) => t + val(a), 0);
  const invested = KOPI_COINS.reduce((t, a) => t + h[a].cost, 0);
  return { h, val, value, invested, pr: invested ? ((value - invested) / invested) * 100 : 0 };
}

/** Количество монеты: у BTC и ETH мелкие доли, поэтому знаков больше. */
export const kq = (q, a) => q.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: KOPI_INFO[a]?.dp ?? 2 });

let cache = null;
const listeners = new Set();
const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KOPI_KEY));
    if (v && v.v === 1 && Array.isArray(v.ops)) return v;
  } catch (e) { /* приватный режим */ }
  return freshKopi();
};

/** Общее состояние связки: изменения сразу видны в обоих приложениях. */
export function useKopi() {
  const [k, setLocal] = useState(() => (cache = cache || load()));
  useEffect(() => {
    listeners.add(setLocal);
    return () => listeners.delete(setLocal);
  }, []);
  const setK = useCallback((fn) => {
    cache = typeof fn === 'function' ? fn(cache || load()) : fn;
    try { localStorage.setItem(KOPI_KEY, JSON.stringify(cache)); } catch (e) { /* ignore */ }
    listeners.forEach((l) => l(cache));
  }, []);
  return [k, setK];
}

export function resetKopi() {
  cache = freshKopi();
  try { localStorage.removeItem(KOPI_KEY); } catch (e) { /* ignore */ }
  listeners.forEach((l) => l(cache));
}
