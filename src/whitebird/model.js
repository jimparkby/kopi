export const WB_KEY = 'kopi.whitebird.v4';

// usd — запасная цена; BTC и ETH берутся из живого курса.
export const COINS = {
  BTC: { name: 'Bitcoin', sym: '₿', bg: '#F7931A', dp: 8, net: 'BTC', fee: 0.00002, addr: 'bc1qkopi7m3x9d0w2lq8h5e4r6t' },
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

export const PROMO = 'KOPI';
export const FEE = 0.03;
export const FEE_PROMO = 0.015;

/** Цена монеты в BYN. */
export function priceByn(R, a) {
  if (a === 'BTC' || a === 'ETH') return R[a];
  return COINS[a].usd * R.usd;
}

/** Чистый старт: кошелёк пустой, истории нет. Монеты появляются от обменов и сдачи KOPI из Альфа Банка. */
export function fresh() {
  return {
    v: 4,
    theme: 'dark',
    hideBalance: false,
    fiat: 0,
    bal: Object.fromEntries(Object.keys(COINS).map((a) => [a, 0])),
    kopiSync: 0,
    cards: [
      { id: 'c1', brand: 'MC', last: '7781', region: 'rb', note: 'Альфа Банк · KOPI', kopi: true },
      { id: 'c2', brand: 'VISA', last: '2222', region: 'rb', note: 'Альфа Банк', kopi: true },
      { id: 'c3', brand: 'MC', last: '9984', region: 'rb', note: 'Другой банк', kopi: false },
    ],
    accounts: [{ id: 'a1', iban: 'BY20 ALFA 3014 7781 0000 0000 0000', bank: 'Альфа Банк' }],
    settings: { push: true, email: true, twofa: true, lang: 'ru' },
    cryptoCard: false,
    readAt: 0,
    orderSeq: 36743,
    hist: [],
  };
}

export const isValid = (s) => s && s.v === 4 && s.bal && Array.isArray(s.cards) && Array.isArray(s.hist);

export const short = (s) => (s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-6) : s);
