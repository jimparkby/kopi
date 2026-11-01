import { useCallback, useEffect, useState } from 'react';
import { fmt, roundUp } from './format.js';

// Связка KOPI — одна на оба приложения: Альфа Банк списывает сдачу с карты,
// WhiteBird сразу покупает на неё криптовалюту. Хранится отдельно и пишется только после действий пользователя.
export const KOPI_KEY = 'kopi.link.v1';
export const KOPI_COINS = ['BTC', 'ETH', 'USDT'];
export const KOPI_INFO = {
  BTC: { code: 'BTC', name: 'Bitcoin', sym: '₿', bg: '#F7931A', risk: 'Высокий риск', desc: 'Высокий риск, высокий потенциал', dp: 8 },
  ETH: { code: 'ETH', name: 'Ethereum', sym: 'Ξ', bg: '#627EEA', risk: 'Средний риск', desc: 'Вторая криптовалюта по капитализации', dp: 6 },
  USDT: { code: 'USDT', name: 'Tether', sym: '₮', bg: '#26A17B', risk: 'Привязан к $', desc: 'Стейблкоин, привязан к доллару', dp: 4 },
};

// Прогрессивная шкала как у подоходного налога: ставка действует только на часть покупки внутри своей ступени.
// Границы в копейках. Пользователь выбирает потолок (3, 5 или 10%) — ступени выше него идут по потолку.
export const KOPI_TIERS = [{ upto: 5000, rate: 3 }, { upto: 20000, rate: 5 }, { upto: Infinity, rate: 10 }];
export const KOPI_RATES = [3, 5, 10];
export const KOPI_STEPS = [100, 500, 1000];
export const KOPI_SAMPLES = [640, 5000, 10000, 45000];

export const PREMIUM_PRICE = 990;
export const FAMILY_MAX = 5;
export const PREM_PERKS = [
  ['Вся семья', 'До ' + FAMILY_MAX + ' близких вместе с вами'],
  ['Общий кошелёк', 'Сдача всех идёт в накопления в WhiteBird'],
  ['Вклад каждого', 'Видно, кто сколько отложил'],
];
const FAMILY_COLORS = ['#F0277A', '#2D9CF0', '#3CC36B', '#F5A623', '#8A5CF6'];
// В демо один телефон: покупки родственников эмулируются кнопкой.
const FAMILY_BUYS = [['Продукты', 4730], ['Аптека', 2315], ['Такси', 1280], ['Одежда', 12990], ['Кофе', 640]];

export const freshKopi = () => ({
  v: 1, linked: false, card: '7781', mode: 'round', step: 100, mult: 1, rate: 10, auto: true, asset: 'BTC', ops: [], saved: [], premium: false, family: [],
});

/** Цена монеты в BYN. */
export const kopiPrice = (R, a) => (a === 'USDT' ? R.usd : R[a]);

/** Отчисление по шкале: сумма по ступеням, округляется один раз в конце. Считаем в целых числах, без ошибок дробей. */
export function kopiPercent(a, ceiling) {
  let sum = 0;
  let from = 0;
  KOPI_TIERS.forEach((t) => {
    sum += Math.max(0, Math.min(a, t.upto) - from) * Math.min(t.rate, ceiling);
    from = t.upto;
  });
  return Math.round(sum / 100);
}

/** Ступени для показа: соседние с одинаковой ставкой склеиваются. */
export function kopiLadder(ceiling) {
  const rows = [];
  let from = 0;
  KOPI_TIERS.forEach((t) => {
    const rate = Math.min(t.rate, ceiling);
    const last = rows[rows.length - 1];
    if (last && last.rate === rate) last.upto = t.upto;
    else rows.push({ from, upto: t.upto, rate });
    from = t.upto;
  });
  return rows.map((r) => ({
    rate: r.rate,
    label: r.upto === Infinity ? (r.from ? 'свыше ' + r.from / 100 + ' BYN' : 'любая сумма') : (r.from ? r.from / 100 + '–' : 'до ') + r.upto / 100 + ' BYN',
  }));
}

/** Сколько уйдёт в KOPI с покупки по текущим настройкам. */
export const kopiCalc = (k, a) => (k.mode === 'pct' ? kopiPercent(a, k.rate) : roundUp(a, k.step, k.mult));

/** То же для реальной оплаты: без подключения — ноль. */
export const kopiRound = (k, a) => (k.linked ? kopiCalc(k, a) : 0);

/** Настройки одной строкой. */
export const kopiRule = (k) => (k.mode === 'pct' ? (k.rate === 3 ? '3% от покупки' : 'прогрессивно 3–' + k.rate + '%') : 'до ' + k.step / 100 + ' BYN · ×' + k.mult);

/** Оценка в месяц при 40 покупках: средняя сдача — половина шага, процент считаем со средней покупки 25 BYN. */
export const kopiMonthly = (k) => (k.mode === 'pct' ? 40 * kopiPercent(2500, k.rate) : Math.round((40 * k.step * k.mult) / 2));

/** Операция KOPI: сдача с карты Альфы → перевод в WhiteBird → покупка монеты по текущему курсу. who — член семьи. */
export function kopiOp(k, R, merchant, a, t, who = null) {
  const up = kopiRound(k, a);
  if (!up) return null;
  const rate = kopiPrice(R, k.asset);
  return { id: 'k' + t, t, merchant: who ? who.name + ' · ' + merchant : merchant, who: who?.id || null, whoName: who?.name || null, a, roundup: up, asset: k.asset, qty: up / 100 / rate, rate };
}

/** Зачислить операции: с автоинвестированием монета покупается сразу, без него сумма ждёт в копилке в BYN. */
export const kopiPut = (k, ops) => (k.auto ? { ...k, ops: [...ops, ...k.ops] } : { ...k, saved: [...ops, ...k.saved] });

/** Купить монету на всю копилку по текущему курсу. Отдельная операция на каждого, чтобы не потерять вклады семьи. */
export function kopiBuySaved(k, R, t) {
  const groups = new Map();
  k.saved.forEach((o) => {
    const g = groups.get(o.who) || { who: o.who, whoName: o.whoName, sum: 0 };
    g.sum += o.roundup;
    groups.set(o.who, g);
  });
  const rate = kopiPrice(R, k.asset);
  const ops = [...groups.values()].map((g, i) => ({
    id: 'k' + (t + i), t: t + i, merchant: g.whoName ? g.whoName + ' · копилка' : 'Копилка KOPI', who: g.who, whoName: g.whoName, batch: true, a: 0, roundup: g.sum, asset: k.asset, qty: g.sum / 100 / rate, rate,
  }));
  return { ...k, saved: [], ops: [...ops.reverse(), ...k.ops] };
}

/** Вклад каждого в семейные накопления: вы, текущие участники и те, кого уже убрали, но их деньги остались. */
export function kopiFamily(k) {
  const by = {};
  [...k.ops, ...k.saved].forEach((o) => {
    const id = o.who || 'me';
    by[id] = by[id] || { sum: 0, count: 0, name: o.whoName };
    by[id].sum += o.roundup;
    by[id].count += 1;
  });
  const row = (id, name, extra) => ({ id, name, sum: by[id]?.sum || 0, count: by[id]?.count || 0, ...extra });
  const rows = [row('me', 'Вы', { color: '#8F5CFF', me: true }), ...k.family.map((m) => row(m.id, m.name, { color: m.color, phone: m.phone }))];
  Object.keys(by).forEach((id) => {
    if (!rows.some((r) => r.id === id)) rows.push(row(id, by[id].name, { color: '#8A96A8', gone: true }));
  });
  const total = rows.reduce((t, r) => t + r.sum, 0);
  return { rows: rows.map((r) => ({ ...r, share: total ? Math.round((r.sum / total) * 100) : 0 })), total };
}

/** Действия раздела «Премиум» — одинаковые в обоих приложениях, отличается только вид. */
export function usePremium(k, setK, R, showToast) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const pick = (c) => { setName(c.name); setPhone(c.phone); };
  const subscribe = () => {
    setK((s) => ({ ...s, premium: true }));
    showToast('Премиум подключён', 'Теперь можно добавить семью');
  };
  const cancel = () => {
    setK((s) => ({ ...s, premium: false }));
    setAdding(false);
    showToast('Премиум отключён', 'Накопленное осталось в кошельке WhiteBird');
  };
  const add = () => {
    const n = name.trim();
    if (!n) return showToast('Укажите имя', 'Как подписать участника');
    if (!/^\+?[\d\s-]{9,}$/.test(phone)) return showToast('Проверьте номер', 'Формат +375 XX XXX-XX-XX');
    if (k.family.some((m) => m.phone === phone)) return showToast('Уже в семье', n);
    if (k.family.length >= FAMILY_MAX) return showToast('Семья заполнена', 'До ' + FAMILY_MAX + ' участников');
    setK((s) => ({ ...s, family: [...s.family, { id: 'm' + Date.now(), name: n, phone, color: FAMILY_COLORS[s.family.length % FAMILY_COLORS.length] }] }));
    setName('');
    setPhone('');
    setAdding(false);
    showToast(n + ' в семье', 'Сдача с карты пойдёт в общие накопления');
  };
  const remove = (m) => {
    setK((s) => ({ ...s, family: s.family.filter((x) => x.id !== m.id) }));
    showToast(m.name + ' больше не в семье', 'Уже накопленное осталось в кошельке');
  };
  const buy = (m) => {
    if (!k.linked) return showToast('Сначала подключите KOPI', 'Без связки сдача никуда не уйдёт');
    const [title, a] = FAMILY_BUYS[(k.ops.length + k.saved.length) % FAMILY_BUYS.length];
    const op = kopiOp(k, R, title, a, Date.now(), m);
    if (!op) return showToast('Сдачи нет', 'Сумма покупки уже круглая');
    setK((s) => kopiPut(s, [op]));
    showToast(m.name + ': ' + title.toLowerCase() + ' ' + fmt(a) + ' BYN', '+' + fmt(op.roundup) + ' BYN ' + (k.auto ? '→ сразу ' + k.asset : '→ в копилку'));
  };
  return { adding, setAdding, name, setName, phone, setPhone, pick, subscribe, cancel, add, remove, buy };
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
  const saved = k.saved.reduce((t, o) => t + o.roundup, 0);
  return { h, val, value, invested, saved, pr: invested ? ((value - invested) / invested) * 100 : 0 };
}

/** Количество монеты: у BTC и ETH мелкие доли, поэтому знаков больше. */
export const kq = (q, a) => q.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: KOPI_INFO[a]?.dp ?? 2 });

let cache = null;
const listeners = new Set();
const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KOPI_KEY));
    if (v && v.v === 1 && Array.isArray(v.ops)) return { ...freshKopi(), ...v };
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
