// Суммы хранятся в копейках (целые числа), чтобы не терять точность.
export const fmt = (k) =>
  (k / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (k) => Math.round(k / 100).toLocaleString('ru-RU');

export const pct = (p) =>
  (p >= 0 ? '+' : '−') + Math.abs(p).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + '%';

export const qty = (q, a) =>
  q.toLocaleString('ru-RU', { maximumFractionDigits: a === 'BTC' ? 6 : a === 'ETH' ? 5 : 2 });

export const usd = (n) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';

export const when = (t, long = false) => {
  const d = new Date(t);
  const n = new Date();
  const tm = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return 'Сегодня, ' + tm;
  const y = new Date(n);
  y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Вчера, ' + tm;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: long ? 'long' : 'short' }) + ', ' + tm;
};

/** «6,40» → 640 копеек; null, если сумма некорректна. */
export const parseAmount = (v, max = 10000000) => {
  const s = String(v || '').replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const k = Math.round(parseFloat(s) * 100);
  return k > 0 && k <= max ? k : null;
};

/** Сдача: сумма округляется вверх до шага и умножается на множитель. */
export const roundUp = (a, step, mult) => (Math.ceil(a / step) * step - a) * mult;
