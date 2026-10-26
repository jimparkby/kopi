export const WB_KEY = 'kopi.whitebird.v3';

// usd — запасная цена; BTC и ETH берутся из живого курса.
export const COINS = {
  BTC: { name: 'Bitcoin', sym: '₿', bg: '#F7931A', dp: 6, net: 'BTC', fee: 0.00002, addr: 'bc1qkopi7m3x9d0w2lq8h5e4r6t' },
  ETH: { name: 'Ethereum', sym: 'Ξ', bg: '#627EEA', dp: 5, net: 'ERC-20', fee: 0.0004, addr: '0x7A1f9C3e5B2d48E0aF6c91D3b4e2' },
  USDT: { name: 'Tether', sym: '₮', bg: '#26A17B', dp: 2, usd: 1, net: 'TRC-20', fee: 1, addr: 'TR1opSkq3Wm8VuJx2Hd7Z8EETA' },
  USDC: { name: 'USD Coin', sym: '$', bg: '#2775CA', dp: 2, usd: 1, net: 'ERC-20', fee: 1, addr: '0x7A1f9C3e5B2d48E0aF6c91D3b4e2' },
  TRX: { name: 'Tron', sym: '▲', bg: '#EB0029', dp: 2, usd: 0.29, net: 'TRC-20', fee: 1, addr: 'TR1opSkq3Wm8VuJx2Hd7Z8EETA' },
  GRAM: { name: 'Gram', sym: '◆', bg: '#3B9BF5', dp: 2, usd: 1.8, net: 'TON', fee: 0.05, addr: 'UQBkopi3x9Lm2Qe7Wd0Ar5tY' },
  SOL: { name: 'Solana', sym: '≡', bg: 'linear-gradient(135deg,#9945FF,#14F195)', dp: 4, usd: 137.82, net: 'Solana', fee: 0.001, addr: '7Kp1oPiXm3Rq9WdZ2bVf8LyN' },
};
export const COIN_KEYS = Object.keys(COINS);
export const KOPI_ASSETS = ['BTC', 'ETH', 'USDT'];
export const KOPI_DESC = { BTC: 'Высокий потенциал', ETH: 'Вторая по капитализации', USDT: 'Стейблкоин, привязан к $' };

export const PRESETS = [['Кофе', 640], ['Шаурма', 990], ['Такси', 1280], ['Продукты', 4730], ['Онлайн-заказ', 8915], ['Фастфуд', 1475]];
export const PROMO = 'KOPI';
export const FEE = 0.03;
export const FEE_PROMO = 0.015;

/** Цена монеты в BYN. */
export function priceByn(R, a) {
  if (a === 'BTC' || a === 'ETH') return R[a];
  return COINS[a].usd * R.usd;
}

export function fresh() {
  const now = Date.now();
  const day = 864e5;
  return {
    v: 3,
    theme: 'dark',
    hideBalance: false,
    linked: false,
    kopiCard: '1111',
    fiat: 24530,
    bal: { BTC: 0.019567, ETH: 0.42, USDT: 152.4, USDC: 30, TRX: 1200, GRAM: 50, SOL: 1.25 },
    piggy: 0,
    step: 100,
    mult: 1,
    asset: 'BTC',
    threshold: 1000,
    hold: { BTC: { qty: 0, cost: 0 }, ETH: { qty: 0, cost: 0 }, USDT: { qty: 0, cost: 0 } },
    cards: [
      { id: 'c1', brand: 'MC', last: '1111', region: 'rb', note: 'Карта Crypto · Альфа Банк', kopi: true },
      { id: 'c2', brand: 'VISA', last: '2222', region: 'rb', note: 'Альфа Банк', kopi: true },
      { id: 'c3', brand: 'MC', last: '9984', region: 'rb', note: 'Другой банк', kopi: false },
    ],
    accounts: [{ id: 'a1', iban: 'BY20 ALFA 3014 7781 0000 0000 0000', bank: 'Альфа Банк' }],
    settings: { push: true, email: true, twofa: true, lang: 'ru' },
    cryptoCard: false,
    readAt: 0,
    orderSeq: 36743,
    hist: [
      { id: 'h1', type: 'in', title: 'Пополнение', sub: 'от: TR1opS…Z8EETA', val: '+ 7 000,00 TRX', status: 'pending', t: now - 0.1 * day },
      { id: 'h2', type: 'out', title: 'Вывод', sub: 'на: bc1qko…6t', val: '− 0,100000 BTC', status: 'done', t: now - 1.1 * day },
      { id: 'h3', type: 'out', title: 'Вывод', sub: 'на: TR1opS…Z8EETA', val: '− 1 000,00 TRX', status: 'fail', t: now - 1.2 * day },
      { id: 'h4', type: 'in', title: 'Пополнение', sub: 'от: TR1opS…Z8EETA', val: '+ 7 000,00 USDT', status: 'done', t: now - 10 * day },
      { id: 'h5', type: 'ex', title: 'Обмен GRAM → BYN', sub: 'на: VISA •••• 2222', val: '+ 5 207,49 BYN', status: 'done', t: now - 11 * day },
      { id: 'h6', type: 'in', title: 'Пополнение', sub: 'от: 0x7A1f…b4e2', val: '+ 1,1500 ETH', status: 'done', t: now - 12 * day },
    ],
  };
}

export const isValid = (s) => s && s.v === 3 && s.bal && s.hold && Array.isArray(s.cards);

export function applyBuy(s, R, t) {
  const amt = s.piggy;
  const a = s.asset;
  const rate = priceByn(R, a);
  const q = amt / 100 / rate;
  return {
    s: {
      ...s,
      piggy: 0,
      bal: { ...s.bal, [a]: s.bal[a] + q },
      hold: { ...s.hold, [a]: { qty: s.hold[a].qty + q, cost: s.hold[a].cost + amt } },
      hist: [{ id: 'b' + t, type: 'buy', asset: a, amount: amt, qty: q, rate, status: 'done', t }, ...s.hist],
    },
    p: { asset: a, amount: amt, qty: q, rate },
  };
}

export const short = (s) => (s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-6) : s);
