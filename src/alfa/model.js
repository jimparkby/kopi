import { roundUp } from '../shared/format.js';

export const ALFA_KEY = 'kopi.alfa.v2';

export const ASSETS = {
  BTC: { name: 'Bitcoin', code: 'BTC', desc: 'Высокий риск, высокий потенциал', sym: '₿', bg: '#F7931A' },
  ETH: { name: 'Ethereum', code: 'ETH', desc: 'Вторая криптовалюта по капитализации', sym: 'Ξ', bg: '#5B6EE1' },
  SAFE: { name: 'Консервативный', code: 'BYN', desc: 'Спокойный инструмент без скачков курса', sym: 'Br', bg: '#0B1F35' },
};
export const ASSET_KEYS = ['BTC', 'ETH', 'SAFE'];

export const TPL = [
  { id: 'light', name: 'Свет', amt: 1000, color: '#F5A623', glyph: 'С', group: 'ЖКХ' },
  { id: 'tv', name: 'TV', amt: 1290, color: '#3CC36B', glyph: 'T', group: 'Связь' },
  { id: 'water', name: 'Водоканал', amt: 4406, color: '#2D9CF0', glyph: 'В', group: 'ЖКХ' },
  { id: 'xbox', name: 'Игры', amt: 2349, color: '#5BC0DE', glyph: 'G', group: 'Развлечения' },
  { id: 'net', name: 'Интернет', amt: 1501, color: '#8A5CF6', glyph: 'И', group: 'Связь' },
  { id: 'gas', name: 'Газ', amt: 2347, color: '#E5483C', glyph: 'Г', group: 'ЖКХ' },
  { id: 'mob', name: 'Мобильная связь', amt: 1835, color: '#EF3124', glyph: 'М', group: 'Связь' },
  { id: 'my', name: 'Мой шаблон', amt: 750, color: '#F0277A', glyph: 'Ш', group: 'Другое' },
];

// Регулярные списания: день месяца, сумма в копейках.
export const SUBS = [
  { id: 'music', name: 'Музыка', plan: 'Семейная', amt: 899, day: 3, color: '#FF4F5E', glyph: '♪' },
  { id: 'movies', name: 'Онлайн-кинотеатр', plan: 'Премиум', amt: 1499, day: 8, color: '#111827', glyph: '▶' },
  { id: 'cloud', name: 'Облако 200 ГБ', plan: 'Стандарт', amt: 590, day: 12, color: '#2D9CF0', glyph: '☁' },
  { id: 'games', name: 'Подписка на игры', plan: 'Ultimate', amt: 2349, day: 17, color: '#3CC36B', glyph: 'G' },
  { id: 'news', name: 'Новости и журналы', plan: 'Базовый', amt: 699, day: 21, color: '#F5A623', glyph: 'N' },
  { id: 'fit', name: 'Фитнес-приложение', plan: 'Годовой / 12', amt: 1290, day: 26, color: '#8A5CF6', glyph: '✦' },
];

export const PRESETS = [['Кофе', 640], ['Шаурма', 990], ['Такси', 1280], ['Продукты', 4730], ['Онлайн-заказ', 8915]];

export const PRODUCTS = [
  { id: 'cc', name: 'Кредитная карта «100 дней»', desc: 'Без процентов до 100 дней', color: '#EF3124', glyph: '%' },
  { id: 'crypto', name: 'Карта Crypto Mastercard', desc: 'Вывод криптовалюты из WhiteBird', color: '#0B1F35', glyph: '₿' },
  { id: 'dep', name: 'Вклад «Альфа-Доход»', desc: 'До 14% годовых в BYN', color: '#3CC36B', glyph: '↗' },
  { id: 'loan', name: 'Кредит наличными', desc: 'Решение за 2 минуты', color: '#2D9CF0', glyph: 'Br' },
];

export const BRANCHES = [
  { name: 'ЦБУ на Немиге', addr: 'ул. Немига, 3', hours: 'Пн–Пт 9:00–19:00', dist: '0,8 км' },
  { name: 'ЦБУ на Победителей', addr: 'пр-т Победителей, 9', hours: 'Пн–Сб 10:00–20:00', dist: '1,6 км' },
  { name: 'Банкомат · ТЦ', addr: 'пр-т Независимости, 48', hours: 'Круглосуточно', dist: '2,3 км' },
  { name: 'ЦБУ в Уручье', addr: 'ул. Ложинская, 5', hours: 'Пн–Пт 9:00–18:00', dist: '9,4 км' },
];

export const CONTACTS = [
  { name: 'Мама', phone: '+375 29 111-22-33', color: '#F0277A' },
  { name: 'Дима', phone: '+375 33 444-55-66', color: '#2D9CF0' },
  { name: 'Аня', phone: '+375 44 777-88-99', color: '#3CC36B' },
];

export function nextCharge(day, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), day);
  if (d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) d.setMonth(d.getMonth() + 1);
  return d;
}

export function applyBuy(s, rates, t) {
  const amt = s.piggy;
  const asset = s.asset;
  const rate = asset === 'SAFE' ? 1 : rates[asset];
  const q = asset === 'SAFE' ? amt / 100 : amt / 100 / rate;
  const hold = { ...s.hold, [asset]: { qty: s.hold[asset].qty + q, cost: s.hold[asset].cost + amt } };
  const p = { id: 'b' + t, type: 'buy', asset, amount: amt, qty: q, rate, t };
  return { s: { ...s, piggy: 0, hold, hist: [p, ...s.hist] }, p };
}

/** Оплата картой: списание, сдача в копилку, автопокупка при достижении порога. */
export function applyPay(s, merchant, a, t, rates, withKopi = true) {
  const up = withKopi ? roundUp(a, s.step, s.mult) : 0;
  s = {
    ...s,
    balance: s.balance - a - up,
    piggy: s.piggy + up,
    hist: up > 0 ? [{ id: 'r' + t, type: 'round', merchant, a, rounded: Math.ceil(a / s.step) * s.step, roundup: up, t }, ...s.hist] : s.hist,
    ops: [{ id: 'o' + t, type: 'pay', title: merchant, amount: -(a + up), round: up, t }, ...s.ops],
  };
  let purchase = null;
  if (s.piggy > 0 && s.piggy >= s.threshold) {
    const r = applyBuy(s, rates, t + 1);
    s = r.s;
    purchase = r.p;
  }
  return { s, roundup: up, purchase };
}

/** Неделя покупок для демо: портфель уже не пустой. */
export function seed(rates) {
  const now = Date.now();
  const day = 864e5;
  const buys = [
    ['Кофе', 640, 6.2], ['Продукты', 4730, 5.8], ['Такси', 1280, 5.1], ['Шаурма', 990, 4.3],
    ['Онлайн-заказ', 8915, 3.6], ['Кофе', 580, 2.9], ['Газ', 2347, 2.2], ['Продукты', 3218, 1.4],
    ['Такси', 1110, 0.8], ['Кофе', 640, 0.15],
  ];
  let s = {
    v: 2,
    seeded: true,
    reseeded: false,
    balance: 124590,
    usd: 15000,
    piggy: 0,
    step: 100,
    mult: 1,
    asset: 'BTC',
    threshold: 1000,
    sel: ['water', 'net', 'light'],
    hold: { BTC: { qty: 0, cost: 0 }, ETH: { qty: 0, cost: 0 }, SAFE: { qty: 0, cost: 0 } },
    subs: Object.fromEntries(SUBS.map((x) => [x.id, { active: x.id !== 'news', kopi: true }])),
    products: [],
    settings: { push: true, faceId: true, kopiPush: true, lang: 'ru' },
    readAt: 0,
    hist: [],
    ops: [{ id: 't0', type: 'topup', title: 'Зарплата', amount: 185000, round: 0, t: now - 7 * day }],
  };
  buys.forEach(([m, a, d], i) => {
    s = applyPay(s, m, a, now - d * day, rates).s;
    if (i === 4) s = applyBuy({ ...s, piggy: s.piggy + 700 }, rates, now - 3.5 * day).s;
    if (i === 7) s = applyBuy({ ...s, asset: 'ETH', piggy: s.piggy + 300 }, rates, now - 1.3 * day).s;
  });
  s.asset = 'BTC';
  return s;
}

export const isValid = (s) => s && s.v === 2 && Array.isArray(s.hist) && s.hist.some((h) => h.type === 'buy');

export function portfolio(s, R) {
  const val = (a) => (a === 'SAFE' ? s.hold.SAFE.cost : Math.round(s.hold[a].qty * R[a] * 100));
  const value = ASSET_KEYS.reduce((t, a) => t + val(a), 0);
  const invested = ASSET_KEYS.reduce((t, a) => t + s.hold[a].cost, 0);
  const pr = invested ? ((value - invested) / invested) * 100 : 0;
  return { val, value, invested, pr };
}
