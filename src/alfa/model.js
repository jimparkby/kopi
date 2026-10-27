import { KOPI_INFO, KOPI_COINS } from '../shared/kopi.js';

export const ALFA_KEY = 'kopi.alfa.v4';
const DAY = 864e5;

// Активы KOPI общие с WhiteBird: покупка идёт в кошелёк биржи.
export const ASSETS = KOPI_INFO;
export const ASSET_KEYS = KOPI_COINS;

/** Типы регулярных платежей — цвета как в референсе: подписки жёлтые, автоплатежи зелёные, счета фиолетовые. */
export const REG_TYPES = {
  sub: { label: 'Подписка', color: '#F5B300' },
  auto: { label: 'Автоплатёж', color: '#21A038' },
  bill: { label: 'Счёт на оплату', color: '#8A5CF6' },
};

// Избранные шаблоны (круглые иконки в «Платежах»).
export const FAVS = [
  { id: 'light', name: 'Свет', amt: 1000, color: '#F5A623', glyph: 'С', cat: 'ЖКХ' },
  { id: 'gas', name: 'Газ', amt: 2347, color: '#E5483C', glyph: 'Г', cat: 'ЖКХ' },
  { id: 'water', name: 'Водоканал', amt: 4406, color: '#2D9CF0', glyph: 'В', cat: 'ЖКХ' },
  { id: 'mama', name: 'Маме', amt: 3000, color: '#F0277A', glyph: 'М', cat: 'Переводы' },
  { id: 'tv', name: 'TV', amt: 1290, color: '#3CC36B', glyph: 'T', cat: 'Связь' },
];

export const PRESETS = [['Кофе', 640, 'Кафе'], ['Шаурма', 990, 'Кафе'], ['Такси', 1280, 'Такси'], ['Продукты', 4730, 'Продукты'], ['Онлайн-заказ', 8915, 'Онлайн-покупки']];

export const PRODUCTS = [
  { id: 'cc', name: 'Кредитная карта «100 дней»', desc: 'Без процентов до 100 дней', color: '#EF3124', glyph: '%' },
  { id: 'crypto', name: 'Карта Crypto Mastercard', desc: 'Вывод криптовалюты из WhiteBird', color: '#0B1F35', glyph: '₿' },
  { id: 'dep', name: 'Вклад «Альфа-Доход»', desc: 'До 14% годовых в BYN', color: '#21A038', glyph: '↗' },
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
  { name: 'Костя', phone: '+375 29 555-00-11', color: '#F5A623' },
];

export const AUTO_CATS = [
  ['repeat', 'Автоперевод', 'Переводы'],
  ['phone', 'Мобильная связь', 'Связь'],
  ['globe', 'Интернет, телефония, ТВ', 'Связь'],
  ['bus', 'Транспорт', 'Транспорт'],
  ['doc', 'Налоги', 'Налоги'],
  ['school', 'Образование', 'Образование'],
];

export const CAT_COLORS = {
  Кафе: '#F5A623', Продукты: '#21A038', Такси: '#111827', 'Онлайн-покупки': '#2D9CF0', ЖКХ: '#E5483C',
  Подписки: '#8A5CF6', Связь: '#EF3124', Переводы: '#F0277A', Транспорт: '#2D9CF0', Налоги: '#6B7280',
  Образование: '#3CC36B', Кино: '#111827', Музыка: '#FF4F5E', Прочее: '#8A96A8', Жильё: '#EF3124',
};

const today0 = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Есть ли списание по регулярному платежу в этот день. */
export function occursOn(r, date) {
  if (!r.active || r.hidden) return false;
  if (r.type === 'bill') return sameDay(new Date(r.date), date);
  if (r.period === 'week') {
    const diff = Math.round((date - new Date(r.anchor)) / DAY);
    return diff >= 0 && diff % 7 === 0;
  }
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === Math.min(r.day, last);
}

export function nextDate(r, from = today0()) {
  for (let i = 0; i < 400; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (occursOn(r, d)) return d;
  }
  return null;
}

export const daysUntil = (d) => (d ? Math.round((d - today0()) / DAY) : null);
export const monthlyCost = (r) => (r.type === 'bill' ? 0 : r.period === 'week' ? Math.round((r.amt * 52) / 12) : r.amt);

/** Оплата картой: списание покупки и сдачи KOPI (сдача сразу уходит в WhiteBird). */
export function applyPay(s, merchant, a, t, roundup = 0, cat = 'Прочее', regId = null) {
  return {
    ...s,
    balance: s.balance - a - roundup,
    ops: [{ id: 'o' + t, type: 'pay', title: merchant, amount: -(a + roundup), round: roundup, cat, regId, t }, ...s.ops],
  };
}

function seedRegs() {
  const t0 = today0();
  const at = (d) => new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + d).getTime();
  const mk = (o) => ({ active: true, hidden: false, kopi: true, period: 'month', card: 'Classic ··7781', ...o });
  return [
    mk({ id: 'g1', type: 'bill', name: 'ГАИ, штраф', amt: 5000, date: at(2), color: '#2D6FD2', glyph: '★', cat: 'Прочее', kopi: false }),
    mk({ id: 's1', type: 'sub', name: 'Музыка', amt: 899, day: ((t0.getDate() + 3 - 1) % 28) + 1, color: '#FF4F5E', glyph: '♪', cat: 'Музыка' }),
    mk({ id: 's2', type: 'sub', name: 'Кинотеатр онлайн', amt: 1499, day: ((t0.getDate() + 8 - 1) % 28) + 1, color: '#111827', glyph: '▶', cat: 'Кино' }),
    mk({ id: 's3', type: 'sub', name: 'Кино+ ТВ', amt: 699, day: ((t0.getDate() + 12 - 1) % 28) + 1, color: '#F0277A', glyph: '✿', cat: 'Кино' }),
    mk({ id: 'a1', type: 'auto', name: 'Квартира', amt: 45000, day: ((t0.getDate() + 5 - 1) % 28) + 1, color: '#EF3124', glyph: 'A', cat: 'Жильё', kopi: false }),
    mk({ id: 'a2', type: 'auto', name: 'Костя К.', amt: 3000, period: 'week', anchor: at(4 - 7), color: '#EF3124', glyph: 'A', cat: 'Переводы', kopi: false }),
    mk({ id: 'a3', type: 'auto', name: 'Мобильная связь', amt: 1835, day: ((t0.getDate() + 10 - 1) % 28) + 1, color: '#E30611', glyph: 'М', cat: 'Связь' }),
    mk({ id: 's4', type: 'sub', name: 'Облако 200 ГБ', amt: 590, day: ((t0.getDate() + 17 - 1) % 28) + 1, color: '#2D9CF0', glyph: '☁', cat: 'Прочее' }),
    mk({ id: 's5', type: 'sub', name: 'Кинотеатр онлайн', amt: 1499, day: ((t0.getDate() + 21 - 1) % 28) + 1, color: '#111827', glyph: '▶', cat: 'Кино', dup: true }),
    mk({ id: 's6', type: 'sub', name: 'Фитнес-приложение', amt: 1290, day: ((t0.getDate() + 25 - 1) % 28) + 1, color: '#8A5CF6', glyph: '✦', cat: 'Прочее', active: false }),
  ];
}

/** Чистый старт: на карте ничего нет, истории нет — всё появляется только от действий пользователя. */
export function fresh() {
  return {
    v: 4,
    balance: 0,
    usd: 0,
    regs: seedRegs(),
    hints: {},
    products: [],
    settings: { push: true, faceId: true, kopiPush: true, lang: 'ru' },
    readAt: 0,
    ops: [],
  };
}

export const isValid = (s) => s && s.v === 4 && Array.isArray(s.regs) && Array.isArray(s.ops);
