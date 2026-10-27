import { useEffect, useMemo, useRef, useState } from 'react';
import { fmt, fmtInt, pct, usd, parseAmount } from '../shared/format.js';
import { useKopi, kopiValue } from '../shared/kopi.js';
import { FALLBACK, useRates } from '../shared/rates.js';
import { usePersisted, useToast, useArmed } from '../shared/hooks.js';
import { Icon } from '../shared/icons.jsx';
import { Phone, Toast, Sheet, Switch } from '../shared/ui.jsx';
import {
  WB_KEY, COINS, COIN_KEYS, KOPI_ASSETS, KOPI_DESC, PROMO, FEE, FEE_PROMO,
  priceByn, fresh, isValid, short,
} from './model.js';
import './whitebird.css';

const GREEN = '#2FC98B';
const RED = '#F25C66';
const ORANGE = '#F5A623';

/** Количество монет с точностью, принятой для актива. */
const cq = (q, a) => q.toLocaleString('ru-RU', { minimumFractionDigits: q && COINS[a]?.dp > 4 ? COINS[a].dp : 2, maximumFractionDigits: COINS[a]?.dp ?? 2 });
const num = (v) => {
  const n = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.'));
  return n > 0 && Number.isFinite(n) ? n : 0;
};
const dayLabel = (t) => {
  const d = new Date(t);
  const n = new Date();
  const y = new Date(n);
  y.setDate(n.getDate() - 1);
  const dm = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  if (d.toDateString() === n.toDateString()) return 'Сегодня, ' + dm;
  if (d.toDateString() === y.toDateString()) return 'Вчера, ' + dm;
  return dm;
};
const timeOf = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function WhiteBirdApp() {
  const [d, setD] = usePersisted(WB_KEY, fresh, isValid);
  const [k, setK] = useKopi();
  const rates = useRates();
  const R = rates || FALLBACK;
  const kp = kopiValue(k, R);
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState(null); // profile | methods | kopi | order
  const [sheet, setSheet] = useState(null);
  const [order, setOrder] = useState(null);
  const [exPreset, setExPreset] = useState(null);
  const [toast, showToast] = useToast();
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  // Сдача из Альфа Банка: каждая новая операция KOPI зачисляет купленную монету в кошелёк и попадает в историю.
  useEffect(() => {
    const incoming = k.ops.filter((o) => o.t > (d.kopiSync || 0));
    if (!incoming.length) return;
    setD((s) => {
      // Сверяемся с уже зачисленным внутри обновления — повторный запуск эффекта не зачислит дважды.
      const incoming = k.ops.filter((o) => o.t > (s.kopiSync || 0));
      if (!incoming.length) return s;
      const bal = { ...s.bal };
      incoming.forEach((o) => { bal[o.asset] = (bal[o.asset] || 0) + o.qty; });
      const hist = incoming.map((o) => ({ id: 'kopi' + o.id, type: 'kopi', merchant: o.merchant, a: o.a, roundup: o.roundup, asset: o.asset, qty: o.qty, status: 'done', t: o.t }));
      return { ...s, bal, hist: [...hist, ...s.hist], kopiSync: Math.max(...incoming.map((o) => o.t)) };
    });
    const sum = incoming.reduce((t, o) => t + o.roundup, 0);
    showToast('Из Альфа Банка: сдача ' + fmt(sum) + ' BYN', 'Куплено и зачислено в кошелёк · ' + incoming.length + ' покуп' + (incoming.length === 1 ? 'ка' : 'ки'));
  }, [k.ops]); // eslint-disable-line react-hooks/exhaustive-deps

  // Переход из Альфы кнопкой «Открыть WhiteBird» — сразу показываем KOPI.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('kopi.open') === '1') { sessionStorage.removeItem('kopi.open'); setScreen('kopi'); }
    } catch (e) { /* ignore */ }
  }, []);

  const go = (t) => { setTab(t); setScreen(null); setSheet(null); };
  const open = (s) => { setScreen(s); setSheet(null); };
  const coinByn = (a, q) => Math.round(q * priceByn(R, a) * 100);
  const coinUsd = (a, q) => (q * priceByn(R, a)) / R.usd;
  const totalUsd = COIN_KEYS.reduce((t, a) => t + coinUsd(a, d.bal[a]), 0);
  const hide = (s) => (d.hideBalance ? '••••••' : s);
  const unread = d.hist.filter((h) => h.t > d.readAt).length;

  const pushHist = (s, h) => ({ ...s, hist: [{ status: 'done', t: Date.now(), id: h.type + Date.now(), ...h }, ...s.hist] });

  /** Заявка на обмен: сразу «В обработке», через пару секунд «Завершено». */
  const placeOrder = (o) => {
    const id = d.orderSeq + 1;
    const full = { ...o, id, status: 'pending', t: Date.now(), hash: Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10) };
    setD((s) => pushHist({ ...o.apply(s), orderSeq: id }, { id: 'ex' + id, type: 'ex', title: 'Обмен ' + o.give.cur + ' → ' + o.get.cur, sub: 'на: ' + o.to, val: '+ ' + o.get.text, status: 'pending' }));
    setOrder(full);
    setScreen('order');
    later(() => {
      setOrder((x) => (x && x.id === id ? { ...x, status: 'done' } : x));
      setD((s) => ({ ...s, hist: s.hist.map((h) => (h.id === 'ex' + id ? { ...h, status: 'done' } : h)) }));
    }, 2200);
  };

  const ctx = {
    d, setD, k, setK, kp, R, tab, go, open, screen, setScreen, setSheet, showToast, coinByn, coinUsd,
    totalUsd, hide, pushHist, placeOrder, order, later, exPreset, setExPreset,
  };
  const titles = { home: '', ex: 'Криптофиатный обмен', hist: null };

  return (
    <Phone theme={'wb ' + (d.theme === 'light' ? 'light' : 'dark')}>
      <div className="w-head">
        <button className="w-head-btn" onClick={() => open('profile')} aria-label="Профиль"><Icon name="user" /></button>
        {tab === 'hist' ? <HistTitle ctx={ctx} /> : <b>{titles[tab]}</b>}
        <button className="w-head-btn" onClick={() => setSheet('notif')} aria-label="Уведомления">
          <Icon name="bell" />
          {unread > 0 && <span className="w-dot" />}
        </button>
      </div>

      <div className="w-body">
        {tab === 'home' && <Home ctx={ctx} />}
        {tab === 'ex' && <Exchange ctx={ctx} key={exPreset ? exPreset.k : 'ex'} />}
        {tab === 'hist' && <History ctx={ctx} />}
      </div>

      <nav className="w-nav">
        <button className={'w-nav-btn' + (tab === 'home' ? ' on' : '')} onClick={() => go('home')}>
          <Icon name="home" size={22} />Главная
        </button>
        <button className={'w-nav-btn center' + (tab === 'ex' ? ' on' : '')} onClick={() => { setExPreset(null); go('ex'); }}>
          <span className="w-fab"><Bird /></span>Обменник
        </button>
        <button className={'w-nav-btn' + (tab === 'hist' ? ' on' : '')} onClick={() => go('hist')}>
          <Icon name="clock" size={22} />История
        </button>
      </nav>

      <Screen open={screen === 'profile'}><Profile ctx={ctx} /></Screen>
      <Screen open={screen === 'methods'}><Methods ctx={ctx} /></Screen>
      <Screen open={screen === 'kopi'}><Kopi ctx={ctx} /></Screen>
      <Screen open={screen === 'order'}>{order && <Order ctx={ctx} />}</Screen>

      <Toast toast={toast} badge="K" />
      <SheetHost ctx={ctx} sheet={sheet} />
    </Phone>
  );
}

function Bird() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path fill="#fff" d="M5 19c4.5.4 8-1.4 10.3-5.6C17.1 9.7 20 7.5 24 7.5c1.6 0 2.9.5 3.8 1.3l-2.6 1.1c.4.8.5 1.6.5 2.5 0 6.5-5.3 11.6-12.4 11.6-3.7 0-6.6-1.6-8.3-5z" />
      <circle cx="22.6" cy="11.4" r="1.2" fill="#2470FF" />
    </svg>
  );
}

function Coin({ a, size = 38 }) {
  const c = COINS[a];
  if (!c) return <span className="w-coin" style={{ width: size, height: size }}>{a?.[0]}</span>;
  return <span className="w-coin" style={{ width: size, height: size, background: c.bg, fontSize: size * 0.42 }}>{c.sym}</span>;
}

function Flag() {
  return <span className="w-flag" aria-hidden="true" />;
}

function Screen({ open, children }) {
  return <div className={'w-screen-layer' + (open ? ' on' : '')} aria-hidden={!open}>{open && children}</div>;
}

function ScreenHead({ title, onBack, right }) {
  return (
    <div className="w-head">
      <button className="w-head-btn" onClick={onBack} aria-label="Назад"><Icon name="left" /></button>
      <b>{title}</b>
      <span className="w-head-right">{right}</span>
    </div>
  );
}

/* ───────────────── Главная ───────────────── */
function Home({ ctx }) {
  const { d, setD, k, kp, R, go, open, setSheet, coinUsd, totalUsd, hide, setExPreset } = ctx;
  const [seg, setSeg] = useState('crypto');
  const last = k.ops[0];
  const priceUsd = (a) => usd(priceByn(R, a) / R.usd);

  return (
    <div className="w-screen">
      <div className="w-total">
        <button className="w-total-label" onClick={() => setD((s) => ({ ...s, hideBalance: !s.hideBalance }))}>
          Общий баланс (crypto) <Icon name={d.hideBalance ? 'eyeOff' : 'eye'} size={15} />
        </button>
        <span className="w-total-val">≈ {hide(usd(totalUsd))}</span>
      </div>

      <div className="w-actions">
        <Action icon="down" label="Пополнить" onClick={() => setSheet('deposit')} />
        <Action icon="up" label="Вывести" onClick={() => setSheet('withdraw')} />
        <Action icon="wallet" label="Купить" primary onClick={() => { setExPreset({ k: Date.now(), dir: 'f2c', asset: 'USDT' }); go('ex'); }} />
        <Action icon="repeat" label="Конвертация" onClick={() => setSheet('convert')} />
        <Action icon="qr" label="Мой QR" onClick={() => setSheet('myqr')} />
      </div>

      <button className="w-banner" onClick={() => open('kopi')}>
        <span className="w-banner-text">
          <b>{k.linked ? 'KOPI: со сдачи куплено на ' + fmt(kp.value) + ' BYN' : 'Новое: KOPI — крипто со сдачи'}</b>
          <span>
            {k.linked
              ? last ? 'Последнее: ' + last.merchant + ' +' + fmt(last.roundup) + ' BYN → ' + cq(last.qty, last.asset) + ' ' + last.asset : 'Платите картой Альфа Банка — сдача купит ' + k.asset
              : 'Сдача с покупок по карте Альфа Банка станет BTC, ETH или USDT'}
          </span>
        </span>
        <span className="w-banner-k">K</span>
      </button>

      <div className="w-tabs">
        {[['crypto', 'Crypto'], ['fiat', 'Валюта'], ['kopi', 'KOPI']].map(([k, l]) => (
          <button key={k} className={seg === k ? 'on' : ''} onClick={() => setSeg(k)}>{l}</button>
        ))}
      </div>

      <div className="w-list">
        {seg === 'crypto' && COIN_KEYS.map((a) => (
          <button key={a} className="w-row" onClick={() => setSheet('coin:' + a)}>
            <Coin a={a} />
            <span className="w-main"><span className="b">{a}</span><small>{priceUsd(a)}</small></span>
            <span className="w-end">
              <span className="b">{hide(cq(d.bal[a], a))}</span>
              <small className={kp.h[a]?.qty ? 'acc' : ''}>{kp.h[a]?.qty ? 'из них ' + cq(kp.h[a].qty, a) + ' от KOPI' : hide(usd(coinUsd(a, d.bal[a])))}</small>
            </span>
          </button>
        ))}
        {seg === 'fiat' && (
          <>
            <button className="w-row" onClick={() => setSheet('deposit:fiat')}>
              <span className="w-coin fiat"><Flag /></span>
              <span className="w-main"><span className="b">BYN</span><small>Электронный счёт</small></span>
              <span className="w-end"><span className="b">{hide(fmt(d.fiat))}</span><small>{hide(usd(d.fiat / 100 / R.usd))}</small></span>
            </button>
            <button className="w-row" onClick={() => setSheet('fiatusd')}>
              <span className="w-coin fiat">$</span>
              <span className="w-main"><span className="b">USD</span><small>Электронный счёт</small></span>
              <span className="w-end"><span className="b">0,00</span><small>0,00 USD</small></span>
            </button>
          </>
        )}
        {seg === 'kopi' && (k.linked ? (
          <>
            {KOPI_ASSETS.filter((a) => kp.h[a].qty > 0).map((a) => (
              <button key={a} className="w-row" onClick={() => open('kopi')}>
                <Coin a={a} />
                <span className="w-main"><span className="b">{a}</span><small>сдачей вложено {fmt(kp.h[a].cost)} BYN</small></span>
                <span className="w-end"><span className="b">{cq(kp.h[a].qty, a)}</span><small className="acc">{fmt(kp.val(a))} BYN</small></span>
              </button>
            ))}
            <button className="w-row" onClick={() => open('kopi')}>
              <span className="w-coin k">K</span>
              <span className="w-main"><span className="b">Карта Альфа Банка •••• {k.card}</span><small>сдача сразу покупает {k.asset}</small></span>
              <Icon name="right" size={18} className="w-chev" />
            </button>
          </>
        ) : (
          <button className="w-row" onClick={() => open('kopi')}>
            <span className="w-coin k">K</span>
            <span className="w-main"><span className="b">KOPI не подключён</span><small>Нажмите, чтобы подключить</small></span>
            <Icon name="right" size={18} className="w-chev" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Action({ icon, label, onClick, primary }) {
  return (
    <button className={'w-action' + (primary ? ' primary' : '')} onClick={onClick}>
      <span><Icon name={icon} size={21} /></span>
      {label}
    </button>
  );
}

/* ───────────────── Криптофиатный обмен ───────────────── */
function Exchange({ ctx }) {
  const { d, R, placeOrder, showToast, setSheet, exPreset } = ctx;
  const [dir, setDir] = useState(exPreset?.dir || 'c2f'); // c2f: продаю крипту, f2c: покупаю
  const [asset, setAsset] = useState(exPreset?.asset || 'GRAM');
  const [amount, setAmount] = useState(exPreset?.dir === 'f2c' ? '100' : '25');
  const [src, setSrc] = useState('account'); // account | external (c2f) / account | card (f2c)
  const [dest, setDest] = useState('c2');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState('');
  const [pickOpen, setPickOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const promoOk = promo.trim().toUpperCase() === PROMO;
  const feeRate = promoOk ? FEE_PROMO : FEE;
  const p = priceByn(R, asset);
  const amt = num(amount);

  let give, get, fee;
  if (dir === 'c2f') {
    const gross = Math.round(amt * p * 100);
    fee = Math.round(gross * feeRate);
    give = { v: amt, cur: asset, text: cq(amt, asset) + ' ' + asset };
    get = { v: gross - fee, cur: 'BYN', text: fmt(Math.max(0, gross - fee)) + ' BYN' };
  } else {
    const k = Math.round(amt * 100);
    fee = Math.round(k * feeRate);
    const q = (k - fee) / 100 / p;
    give = { v: k, cur: 'BYN', text: fmt(k) + ' BYN' };
    get = { v: q, cur: asset, text: cq(Math.max(0, q), asset) + ' ' + asset };
  }
  const destCard = d.cards.find((c) => c.id === dest);
  const destLabel = dir === 'f2c' ? 'Кошелёк WhiteBird' : dest === 'account' ? 'Электронный счёт BYN' : destCard ? destCard.brand + ' •••• ' + destCard.last : 'Выберите карту';

  const submit = () => {
    if (!amt) return showToast('Введите сумму', dir === 'c2f' ? 'Сколько ' + asset + ' продаёте' : 'Сколько BYN тратите');
    if (dir === 'c2f' && src === 'account' && amt > d.bal[asset] + 1e-12) return showToast('Недостаточно ' + asset, 'На счёте ' + cq(d.bal[asset], asset) + ' ' + asset);
    if (dir === 'f2c' && src === 'account' && give.v > d.fiat) return showToast('Недостаточно BYN', 'На электронном счёте ' + fmt(d.fiat) + ' BYN');
    if (dir === 'c2f' && dest !== 'account' && !destCard) return showToast('Выберите карту', 'Куда зачислить BYN');
    const from = dir === 'c2f' ? (src === 'account' ? 'Электронного счёта' : 'Внешнего адреса') : src === 'account' ? 'Электронного счёта BYN' : 'Карты •••• 1111';
    placeOrder({
      give, get, fee: fmt(fee) + ' BYN', from, to: destLabel, rate: '1 ' + asset + ' ≈ ' + fmt(Math.round(p * 100)) + ' BYN',
      apply: (s) => {
        if (dir === 'c2f') {
          return {
            ...s,
            bal: src === 'account' ? { ...s.bal, [asset]: s.bal[asset] - amt } : s.bal,
            fiat: dest === 'account' ? s.fiat + get.v : s.fiat,
          };
        }
        return { ...s, fiat: src === 'account' ? s.fiat - give.v : s.fiat, bal: { ...s.bal, [asset]: s.bal[asset] + get.v } };
      },
    });
  };

  const assetBox = (
    <button className="w-asset-pick" onClick={() => setPickOpen((v) => !v)}>
      <Coin a={asset} size={26} />
      <span><b>{asset}</b><small>{COINS[asset].name}</small></span>
      <Icon name="chevDown" size={18} />
    </button>
  );
  const bynBox = <span className="w-asset-pick static"><Flag /><b>BYN</b></span>;

  return (
    <div className="w-screen">
      <span className="w-muted">1,00 {asset} ≈ {fmt(Math.round(p * 100))} BYN · {R.src}</span>

      <span className="w-label">Продаю</span>
      <div className="w-field-row">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Продаю" />
        {dir === 'c2f' ? assetBox : bynBox}
      </div>
      {pickOpen && (
        <div className="w-dropdown">
          {COIN_KEYS.map((a) => (
            <button key={a} className={a === asset ? 'on' : ''} onClick={() => { setAsset(a); setPickOpen(false); }}>
              <Coin a={a} size={26} /><b>{a}</b><small>{cq(d.bal[a], a)}</small>
            </button>
          ))}
        </div>
      )}
      <div className="w-radios">
        <Radio on={src === 'account'} onClick={() => setSrc('account')} label="Электронный счёт" />
        <Radio on={src !== 'account'} onClick={() => setSrc(dir === 'c2f' ? 'external' : 'card')} label={dir === 'c2f' ? 'Внешний адрес' : 'Карта •••• 1111'} />
      </div>
      {dir === 'c2f' && src === 'account' && (
        <span className="w-hint">Доступно {cq(d.bal[asset], asset)} {asset} · <button className="w-mini-link" onClick={() => setAmount(String(d.bal[asset]).replace('.', ','))}>Всё</button></span>
      )}
      {dir === 'c2f' && src === 'external' && <span className="w-hint">Адрес для перевода покажем после создания заявки</span>}
      {dir === 'f2c' && src === 'account' && <span className="w-hint">Электронный счёт: {fmt(d.fiat)} BYN</span>}

      <button className="w-swap" onClick={() => { setDir(dir === 'c2f' ? 'f2c' : 'c2f'); setSrc('account'); setAmount(dir === 'c2f' ? '100' : '10'); setPickOpen(false); }} aria-label="Поменять направление">
        <Icon name="swap" size={18} />
      </button>

      <span className="w-label">Получаю</span>
      <div className="w-field-row">
        <span className="w-field-val">{amt ? get.text.replace(' ' + get.cur, '') : '0'}</span>
        {dir === 'c2f' ? bynBox : assetBox}
      </div>

      {dir === 'c2f' ? (
        <>
          <button className="w-field-row w-card-pick" onClick={() => setDestOpen((v) => !v)}>
            {dest === 'account' ? <span className="w-mc acc"><Flag /></span> : <span className={'w-mc ' + (destCard?.brand === 'VISA' ? 'visa' : '')}>{destCard?.brand === 'VISA' ? 'VISA' : ''}</span>}
            <span className="w-card-num">{dest === 'account' ? 'Электронный счёт BYN' : '•••• •••• •••• ' + (destCard?.last || '')}</span>
            <Icon name="chevDown" size={18} />
          </button>
          {destOpen && (
            <div className="w-dropdown">
              {d.cards.filter((c) => c.region === 'rb').map((c) => (
                <button key={c.id} className={dest === c.id ? 'on' : ''} onClick={() => { setDest(c.id); setDestOpen(false); }}>
                  <span className={'w-mc ' + (c.brand === 'VISA' ? 'visa' : '')}>{c.brand === 'VISA' ? 'VISA' : ''}</span><b>•••• {c.last}</b><small>{c.note}</small>
                </button>
              ))}
              <button className={dest === 'account' ? 'on' : ''} onClick={() => { setDest('account'); setDestOpen(false); }}>
                <span className="w-mc acc"><Flag /></span><b>Электронный счёт</b><small>{fmt(d.fiat)} BYN</small>
              </button>
              <button onClick={() => { setDestOpen(false); setSheet('addcard'); }}>
                <span className="w-mc add"><Icon name="plus" size={14} /></span><b>Привязать карту РБ</b>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-field-row w-card-pick static"><Coin a={asset} size={22} /><span className="w-card-num">В кошелёк WhiteBird</span></div>
      )}

      <div className="w-fee"><span>Комиссия сервиса</span><i /><span>{fmt(fee)} BYN</span><Icon name="help" size={14} /></div>
      {promoOpen ? (
        <label className={'w-promo' + (promo && !promoOk ? ' bad' : promoOk ? ' ok' : '')}>
          <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Промокод, например KOPI" autoFocus />
          <span>{promoOk ? 'Комиссия 1,5%' : promo ? 'Не найден' : ''}</span>
        </label>
      ) : (
        <button className="w-mini-link left" onClick={() => setPromoOpen(true)}>У меня есть промокод</button>
      )}
      <button className="w-btn primary" onClick={submit}>Обменять</button>
      <span className="w-vip">VIP-тариф от персонального менеджера — при операции от 20 000 USDT</span>
    </div>
  );
}

function Radio({ on, onClick, label }) {
  return (
    <button className={'w-radio-btn' + (on ? ' on' : '')} onClick={onClick} role="radio" aria-checked={on}>
      <span />{label}
    </button>
  );
}

function Order({ ctx }) {
  const { order, setScreen, setD, go, showToast } = ctx;
  const [more, setMore] = useState(false);
  const done = order.status === 'done';
  const copy = async () => {
    try { await navigator.clipboard.writeText(order.hash); } catch (e) { /* нет доступа к буферу */ }
    showToast('Хэш скопирован', short(order.hash));
  };
  return (
    <>
      <ScreenHead title="Криптофиатный обмен" onBack={() => setScreen(null)} />
      <div className="w-body full">
        <div className="w-screen">
          <div className="w-order">
            <div className="w-order-head">
              <b>Заявка на обмен</b>
              <span>№{order.id}</span>
            </div>
            <span className={'w-status ' + (done ? 'done' : 'pending')}>
              {done ? <Icon name="check" size={14} stroke={3} /> : <span className="spinner sm" />}
              {done ? 'Завершено' : 'В обработке'}
            </span>
            <div className="w-order-amt">
              <CurIcon cur={order.give.cur} />
              <b>{order.give.text}</b>
            </div>
            <Icon name="down" size={18} className="w-order-arrow" />
            <div className="w-order-amt">
              <CurIcon cur={order.get.cur} />
              <b>{order.get.text}</b>
            </div>
            <div className="w-kv"><span>Отдаю с</span><i /><b>{order.from}</b></div>
            <div className="w-kv"><span>Получаю на</span><i /><b>{order.to}</b></div>
            <div className="w-kv"><span>Хэш</span><i /><b>{short(order.hash)}</b><button className="w-icon-btn" onClick={copy} aria-label="Скопировать"><Icon name="copy" size={16} /></button></div>
            {more && (
              <>
                <div className="w-kv"><span>Курс</span><i /><b>{order.rate}</b></div>
                <div className="w-kv"><span>Комиссия</span><i /><b>{order.fee}</b></div>
                <div className="w-kv"><span>Создана</span><i /><b>{dayLabel(order.t)}, {timeOf(order.t)}</b></div>
              </>
            )}
            <button className="w-mini-link right" onClick={() => setMore((v) => !v)}>{more ? 'Скрыть' : 'Больше информации'}</button>
          </div>
          <button className="w-btn primary" onClick={() => { setScreen(null); go('ex'); }}>Совершить новую операцию</button>
          <button className="w-btn soft" onClick={() => { setD((s) => ({ ...s, histCat: 'ex' })); go('hist'); }}>Перейти в историю</button>
        </div>
      </div>
    </>
  );
}

function CurIcon({ cur }) {
  if (cur === 'BYN') return <span className="w-coin fiat sm"><Flag /></span>;
  return <Coin a={cur} size={30} />;
}

/* ───────────────── История ───────────────── */
const CATS = [['all', 'Все операции'], ['io', 'Пополнение / Вывод'], ['ex', 'Обмен'], ['kopi', 'KOPI']];
const CAT_FILTER = {
  all: () => true,
  io: (h) => h.type === 'in' || h.type === 'out',
  ex: (h) => h.type === 'ex' || h.type === 'conv',
  kopi: (h) => h.type === 'kopi',
};

function HistTitle({ ctx }) {
  const { d, setD } = ctx;
  const cat = d.histCat || 'all';
  const [openMenu, setOpenMenu] = useState(false);
  return (
    <div className="w-title-dd">
      <button onClick={() => setOpenMenu((v) => !v)}>
        <b>{CATS.find((c) => c[0] === cat)[1]}</b>
        <Icon name="chevDown" size={18} />
      </button>
      {openMenu && (
        <div className="w-dropdown floating">
          {CATS.map(([k, l]) => (
            <button key={k} className={cat === k ? 'on' : ''} onClick={() => { setD((s) => ({ ...s, histCat: k })); setOpenMenu(false); }}>
              <b>{l}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function histView(h) {
  if (h.type === 'kopi') return { coin: h.asset, title: 'KOPI · ' + h.merchant, sub: 'сдача ' + fmt(h.roundup) + ' BYN · Альфа Банк', val: '+ ' + cq(h.qty, h.asset) + ' ' + h.asset, cls: 'pos' };
  if (h.type === 'round') return { icon: 'K', k: true, title: 'Сдача · ' + h.merchant, sub: fmt(h.a) + ' → ' + fmt(h.rounded) + ' BYN', val: '+ ' + fmt(h.roundup) + ' BYN', cls: 'acc' };
  if (h.type === 'buy') return { coin: h.asset, title: 'KOPI · покупка ' + h.asset, sub: 'пакетом на ' + fmt(h.amount) + ' BYN', val: '+ ' + cq(h.qty, h.asset) + ' ' + h.asset, cls: 'pos' };
  const icon = h.type === 'out' ? 'up' : h.type === 'in' ? 'down' : 'swap';
  return { icon, title: h.title, sub: h.sub, val: h.val, cls: h.val.startsWith('−') ? 'neg' : 'pos' };
}

function HistRow({ h, onClick }) {
  const v = histView(h);
  const color = h.status === 'pending' ? ORANGE : h.status === 'fail' ? RED : undefined;
  return (
    <button className="w-row hist" onClick={onClick}>
      {v.coin ? <Coin a={v.coin} size={34} /> : <span className={'w-hist-ic' + (v.k ? ' k' : '')}>{v.k ? 'K' : <Icon name={v.icon} size={17} />}</span>}
      <span className="w-main"><span>{v.title}</span><small>{v.sub}</small></span>
      <span className="w-end">
        <span className={'b ' + v.cls} style={color ? { color } : undefined}>{v.val}</span>
        <StatusIcon status={h.status} />
      </span>
    </button>
  );
}

function StatusIcon({ status }) {
  if (status === 'pending') return <span className="w-st pending" title="В обработке"><Icon name="clock" size={13} /></span>;
  if (status === 'fail') return <span className="w-st fail" title="Отклонено"><Icon name="close" size={11} stroke={3} /></span>;
  return <span className="w-st done" title="Завершено"><Icon name="check" size={11} stroke={3} /></span>;
}

function History({ ctx }) {
  const { d, setSheet, showToast } = ctx;
  const cat = d.histCat || 'all';
  const status = d.histStatus || 'all';
  const list = d.hist.filter(CAT_FILTER[cat]).filter((h) => status === 'all' || (h.status || 'done') === status);
  const groups = [];
  list.forEach((h) => {
    const label = dayLabel(h.t);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(h);
    else groups.push({ label, items: [h] });
  });

  const download = () => {
    const rows = [['Дата', 'Операция', 'Детали', 'Сумма', 'Статус']].concat(
      list.map((h) => {
        const v = histView(h);
        return [new Date(h.t).toLocaleString('ru-RU'), v.title, v.sub, v.val, { pending: 'В обработке', fail: 'Отклонено' }[h.status] || 'Завершено'];
      }),
    );
    const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whitebird-report-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Отчёт сформирован', list.length + ' операций · CSV');
  };

  return (
    <div className="w-screen">
      <div className="w-hist-tools">
        <button className={'w-tool-sq' + (status !== 'all' ? ' on' : '')} onClick={() => setSheet('histfilter')} aria-label="Фильтр"><Icon name="grid" size={18} /></button>
        <button className="w-tool" onClick={download}><Icon name="doc" size={16} /> Скачать отчёт</button>
      </div>
      {groups.length === 0 && <div className="w-empty">Операций нет</div>}
      {groups.map((g) => (
        <div key={g.label} className="w-group">
          <span className="w-group-label">{g.label}</span>
          {g.items.map((h) => <HistRow key={h.id} h={h} onClick={() => setSheet('op:' + h.id)} />)}
        </div>
      ))}
    </div>
  );
}

/* ───────────────── KOPI ───────────────── */
/** Перейти в Альфа Банк сразу на экран KOPI — там оплата картой и настройки сдачи. */
const openAlfa = () => {
  try { sessionStorage.setItem('kopi.open', 'alfa'); } catch (e) { /* ignore */ }
  window.location.hash = '/alfa';
};

function Kopi({ ctx }) {
  const { k, setK, R, kp, setScreen, showToast, later } = ctx;
  const [linking, setLinking] = useState(false);
  const [setup, setSetup] = useState(false);
  const [armed, arm] = useArmed();
  const set = (patch) => setK((s) => ({ ...s, ...patch }));
  const chip = (items, cur, key, lab) =>
    items.map((v) => <button key={v} className={v === cur ? 'on' : ''} onClick={() => set({ [key]: v })}>{lab(v)}</button>);

  const link = () => {
    if (linking) return;
    setLinking(true);
    later(() => {
      setLinking(false);
      set({ linked: true });
      showToast('KOPI подключён к •••• ' + k.card, 'Сдача с карты Альфа Банка будет приходить сюда');
    }, 1400);
  };

  const held = KOPI_ASSETS.filter((a) => kp.h[a].qty > 0);

  return (
    <>
      <ScreenHead title="KOPI · крипто со сдачи" onBack={() => setScreen(null)} />
      <div className="w-body full">
        {!k.linked ? (
          <div className="w-screen">
            <div className="w-intro">
              <b>Криптовалюта со сдачи<br />с карты Альфа Банка</b>
              <span>Платите картой Альфа Банка как обычно. Банк округляет покупку вверх и сразу переводит сдачу сюда — WhiteBird мгновенно покупает на неё BTC, ETH или USDT.</span>
            </div>
            <div className="w-panel">
              <div className="w-panel-head"><Flag />Карта для KOPI</div>
              <div className="w-card-opt on">
                <b className="mc"><span className="w-mc" /></b>
                <span className="w-main"><span>•••• {k.card} BYN</span><small className="acc">Альфа Банк · партнёр KOPI</small></span>
                <span className="w-radio" />
              </div>
            </div>
            <div className="w-example"><span>Кофе 6,40 → 7,00</span><b>+0,60 BYN → {k.asset}</b></div>
            <button className="w-btn primary" onClick={link} disabled={linking}>
              {linking && <span className="spinner" />}
              {linking ? 'Подключаем…' : 'Подключить KOPI к •••• ' + k.card}
            </button>
            <span className="w-fine">Банк передаёт WhiteBird только сумму сдачи. Данные карты остаются в банке.</span>
          </div>
        ) : (
          <div className="w-screen">
            <div className="w-panel">
              <div className="w-panel-row"><span>Куплено со сдачи</span><span className="w-live"><i style={{ background: R.live ? GREEN : '#7C869A' }} />{R.src}</span></div>
              <span className="w-big-val">{fmt(kp.value)} BYN</span>
              <div className="w-panel-row"><span>Сдачей вложено {fmt(kp.invested)} BYN</span><b style={{ color: kp.pr >= 0 ? GREEN : RED }}>{kp.invested ? pct(kp.pr) : '—'}</b></div>
              {held.map((a) => {
                const c = kp.h[a].cost;
                const v = kp.val(a);
                const dd = c ? ((v - c) / c) * 100 : 0;
                return (
                  <div key={a} className="w-hold">
                    <Coin a={a} size={34} />
                    <span className="w-main"><span>{a}</span><small>{cq(kp.h[a].qty, a)} {a} · {fmt(Math.round(priceByn(R, a) * 100))} BYN</small></span>
                    <span className="w-end"><span className="b">{fmt(v)} BYN</span><small style={{ color: dd >= 0 ? GREEN : RED }}>{pct(dd)}</small></span>
                  </div>
                );
              })}
            </div>

            <div className="w-panel">
              <div className="w-panel-row"><span>Сдача приходит с карты</span><span>Альфа Банк •••• {k.card}</span></div>
              <div className="w-example inset"><span>Покупка → сдача → {k.asset}</span><b>сразу</b></div>
              <button className="w-btn primary sm" onClick={openAlfa}>Оплатить картой в Альфа Банке</button>
            </div>

            <div className="w-panel">
              <b className="w-panel-title">Последние покупки со сдачи</b>
              {k.ops.length === 0 ? (
                <span className="w-fine left">Пока пусто. Оплатите что-нибудь картой Альфа Банка — монета появится здесь через секунду.</span>
              ) : (
                k.ops.slice(0, 5).map((o) => (
                  <div key={o.id} className="w-hold">
                    <Coin a={o.asset} size={34} />
                    <span className="w-main"><span>{o.merchant}</span><small>сдача {fmt(o.roundup)} BYN · {dayLabel(o.t)}, {timeOf(o.t)}</small></span>
                    <span className="w-end"><span className="b pos">+{cq(o.qty, o.asset)}</span><small>{o.asset}</small></span>
                  </div>
                ))
              )}
            </div>

            <div className={'w-panel w-fold' + (setup ? ' open' : '')}>
              <button className="w-fold-head" onClick={() => setSetup(!setup)} aria-expanded={setup}>
                <span className="w-main"><b className="w-panel-title">Настройки покупки</b><small>{k.asset} · до {fmtInt(k.step)} BYN · ×{k.mult}</small></span>
                <Icon name="chevDown" size={20} stroke={2.4} className="w-fold-chev" />
              </button>
              {setup && (<>
              <span className="w-label">Что покупать</span>
              <div className="w-assets">
                {KOPI_ASSETS.map((a) => (
                  <button key={a} className={k.asset === a ? 'on' : ''} onClick={() => set({ asset: a })}>
                    <Coin a={a} size={32} /><b>{a}</b><small>{KOPI_DESC[a]}</small>
                  </button>
                ))}
              </div>
              <span className="w-label">Округлять до</span>
              <div className="w-chips">{chip([100, 500, 1000], k.step, 'step', (v) => fmtInt(v) + ' BYN')}</div>
              <span className="w-label">Множитель сдачи</span>
              <div className="w-chips">{chip([1, 2, 5], k.mult, 'mult', (v) => '×' + v)}</div>
              </>)}
            </div>
            <button className="w-reset" onClick={() => arm(() => { set({ linked: false }); showToast('KOPI отключён', 'Купленные монеты остались в кошельке'); })}>
              {armed ? 'Нажмите ещё раз, чтобы отключить' : 'Отключить KOPI'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ───────────────── Профиль ───────────────── */
function Profile({ ctx }) {
  const { d, setScreen, open, setSheet } = ctx;
  return (
    <>
      <ScreenHead
        title=""
        onBack={() => setScreen(null)}
        right={
          <>
            <button className="w-head-btn" onClick={() => setSheet('support')} aria-label="Чат поддержки"><Icon name="chat" /></button>
            <button className="w-head-btn" onClick={() => setSheet('notif')} aria-label="Уведомления"><Icon name="bell" /><span className="w-dot" /></button>
          </>
        }
      />
      <div className="w-body full">
        <div className="w-screen">
          <div className="w-prof">
            <span className="w-avatar"><Icon name="user" size={26} /></span>
            <span className="w-main">
              <b>ale***@****</b>
              <span className="w-verified"><Icon name="shield" size={13} /> Верифицирован</span>
            </span>
          </div>
          <div className="w-prof-tiles">
            <button onClick={() => setSheet('referral')}><span className="w-tile-art gift"><Icon name="gift" size={22} /></span>Реферальная программа</button>
            <button onClick={() => setSheet('cryptocard')}><span className="w-tile-art card" />Выпуск криптокарт</button>
          </div>
          <div className="w-menu">
            <MenuRow icon="user" label="Профиль" onClick={() => setSheet('personal')} />
            <MenuRow icon="shield" label="Безопасность" onClick={() => setSheet('security')} />
            <MenuRow icon="bell" label="Уведомления" onClick={() => setSheet('notifset')} />
            <MenuRow icon="card" label="Способы оплаты" onClick={() => open('methods')} />
            <MenuRow kopi label="KOPI · крипто со сдачи" sub={k.linked ? 'Подключён · Альфа Банк •••• ' + k.card : 'Не подключён'} onClick={() => open('kopi')} />
            <MenuRow icon="gear" label="Настройки" onClick={() => setSheet('settings')} />
            <MenuRow icon="doc" label="Информация" onClick={() => setSheet('info')} />
          </div>
        </div>
      </div>
    </>
  );
}

function MenuRow({ icon, kopi, label, sub, onClick }) {
  return (
    <button className="w-menu-row" onClick={onClick}>
      {kopi ? <span className="w-k-mini">K</span> : <Icon name={icon} size={20} />}
      <span className="w-main"><span>{label}</span>{sub && <small>{sub}</small>}</span>
      <Icon name="right" size={18} className="w-chev" />
    </button>
  );
}

/* ───────────────── Способы оплаты ───────────────── */
function Methods({ ctx }) {
  const { d, setD, setScreen, setSheet, showToast, later } = ctx;
  const [tab, setTab] = useState('cards');
  const [region, setRegion] = useState('rb');
  const [full, setFull] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cards = d.cards.filter((c) => c.region === region);
  const shown = full ? cards : cards.slice(0, 3);

  const remove = (c) => {
    if (c.last === ctx.k.card && ctx.k.linked) return showToast('Карта подключена к KOPI', 'Сначала отключите KOPI или выберите другую карту');
    setD((s) => ({ ...s, cards: s.cards.filter((x) => x.id !== c.id) }));
    showToast('Карта отвязана', c.brand + ' •••• ' + c.last);
  };
  const refresh = () => {
    setRefreshing(true);
    later(() => { setRefreshing(false); showToast('Список карт обновлён', d.cards.length + ' карт'); }, 1000);
  };

  return (
    <>
      <ScreenHead title="Способы оплаты" onBack={() => setScreen('profile')} />
      <div className="w-body full">
        <div className="w-screen">
          <div className="w-tabs">
            {[['cards', 'Карты'], ['acc', 'Расчётные счета'], ['other', 'Другие способы']].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'cards' && (
            <>
              <button className="w-btn soft" onClick={refresh} disabled={refreshing}>{refreshing && <span className="spinner" />}Обновить список карт</button>
              <div className="w-chips">
                <button className={region === 'rb' ? 'on' : ''} onClick={() => setRegion('rb')}>Карты РБ</button>
                <button className={region === 'rf' ? 'on' : ''} onClick={() => setRegion('rf')}>Карты РФ</button>
              </div>
              <div className="w-panel">
                <div className="w-panel-head">{region === 'rb' ? <Flag /> : <span className="w-flag rf" />}Карты банков {region === 'rb' ? 'РБ' : 'РФ'}</div>
                {shown.length === 0 && <span className="w-fine left">Привязанных карт нет</span>}
                {shown.map((c) => (
                  <div key={c.id} className="w-card-line">
                    {c.brand === 'VISA' ? <b className="visa">VISA</b> : <span className="w-mc" />}
                    <span className="w-card-num">•••• •••• •••• {c.last}</span>
                    <small>BYN</small>
                    <button className="w-icon-btn" onClick={() => setSheet('editcard:' + c.id)} aria-label="Изменить"><Icon name="doc" size={16} /></button>
                    <button className="w-icon-btn" onClick={() => remove(c)} aria-label="Отвязать"><Icon name="close" size={16} /></button>
                  </div>
                ))}
                {cards.length > 3 && <button className="w-mini-link right" onClick={() => setFull((v) => !v)}>{full ? 'Свернуть' : 'Полный список'} <Icon name="chevDown" size={14} /></button>}
                <button className="w-btn primary" onClick={() => (region === 'rb' ? setSheet('addcard') : showToast('Карты РФ', 'Привязка временно недоступна'))}>
                  Привязать карту {region === 'rb' ? 'РБ' : 'РФ'}
                </button>
              </div>
              <button className="w-promo-banner" onClick={() => setSheet('cryptocard')}>
                <span>Карта Crypto — цифровая карта для криптофиатного обмена, оплаты товаров и услуг</span>
                <span className="w-promo-art" />
              </button>
              <div className="w-section-head"><b>Криптокарты</b><span className="w-tag">Рекомендуем</span></div>
              <div className="w-cc-row">
                <button className="w-cc alfa" onClick={() => setSheet('cryptocard')}>
                  <span className="w-cc-top"><small>WHITEBIRD</small><b>A</b></span>
                  <span className="w-cc-word">CRYPTO</span>
                  <span className="w-cc-mc" />
                </button>
                <button className="w-cc status" onClick={() => setSheet('cryptocard:status')}>
                  <span className="w-cc-top"><small>Статусбанк</small><small>WHITEBIRD</small></span>
                  <span className="w-cc-coins">₽ ₿</span>
                </button>
              </div>
            </>
          )}

          {tab === 'acc' && (
            <>
              <div className="w-panel">
                {d.accounts.map((a) => (
                  <div key={a.id} className="w-card-line">
                    <Icon name="doc" size={18} />
                    <span className="w-main"><span>{a.iban}</span><small>{a.bank}</small></span>
                  </div>
                ))}
              </div>
              <button className="w-btn primary" onClick={() => setSheet('addacc')}>Добавить расчётный счёт</button>
            </>
          )}

          {tab === 'other' && (
            <div className="w-menu">
              <MenuRow icon="grid" label="ЕРИП" sub="Пополнение BYN через ЕРИП" onClick={() => setSheet('erip')} />
              <MenuRow icon="wallet" label="Криптовалютой" sub="С внешнего кошелька" onClick={() => setSheet('deposit')} />
              <MenuRow icon="pin" label="Наличными в кассе банка" sub="Альфа Банк, Статусбанк" onClick={() => showToast('Пункты выдачи', 'Отделения банков-партнёров в Минске')} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────────────── Шторки ───────────────── */
function SheetHost({ ctx, sheet }) {
  const { setSheet } = ctx;
  const [key, arg] = sheet ? sheet.split(':') : [null, null];
  const T = {
    deposit: ['Пополнить', 'Криптовалютой или с карты'],
    withdraw: ['Вывести', 'На карту или внешний адрес'],
    convert: ['Конвертация', 'Обмен одной криптовалюты на другую'],
    myqr: ['Мой QR', 'Адрес для пополнения'],
    coin: [arg ? COINS[arg]?.name : '', arg],
    fiatusd: ['Счёт в USD', 'Электронный счёт'],
    notif: ['Уведомления', ''],
    histfilter: ['Фильтр', 'Статус операции'],
    op: ['Операция', ''],
    support: ['Поддержка', 'Обычно отвечаем за 2 минуты'],
    referral: ['Реферальная программа', 'Приглашайте друзей'],
    cryptocard: [arg === 'status' ? 'Карта Статусбанка' : 'Карта Crypto', 'Альфа Банк × WhiteBird · Mastercard'],
    personal: ['Профиль', 'Личные данные'],
    security: ['Безопасность', ''],
    notifset: ['Уведомления', 'Что присылать'],
    settings: ['Настройки', ''],
    info: ['Информация', 'Тарифы и документы'],
    addcard: ['Привязать карту РБ', 'Карта для вывода и оплаты'],
    editcard: ['Карта', ''],
    addacc: ['Расчётный счёт', 'Для вывода BYN'],
    erip: ['ЕРИП', 'Пополнение электронного счёта'],
  };
  const [title, subtitle] = T[key] || ['', ''];
  return (
    <Sheet open={!!sheet} onClose={() => setSheet(null)} title={title} subtitle={subtitle}>
      {key === 'deposit' && <DepositSheet ctx={ctx} initial={arg} />}
      {key === 'withdraw' && <WithdrawSheet ctx={ctx} />}
      {key === 'convert' && <ConvertSheet ctx={ctx} />}
      {key === 'myqr' && <QrSheet ctx={ctx} a="USDT" />}
      {key === 'coin' && COINS[arg] && <CoinSheet ctx={ctx} a={arg} />}
      {key === 'fiatusd' && <FiatUsdSheet ctx={ctx} />}
      {key === 'notif' && <NotifSheet ctx={ctx} />}
      {key === 'histfilter' && <HistFilterSheet ctx={ctx} />}
      {key === 'op' && <OpSheet ctx={ctx} id={arg} />}
      {key === 'support' && <SupportSheet />}
      {key === 'referral' && <ReferralSheet ctx={ctx} />}
      {key === 'cryptocard' && <CryptoCardSheet ctx={ctx} variant={arg} />}
      {key === 'personal' && <PersonalSheet />}
      {key === 'security' && <SecuritySheet ctx={ctx} />}
      {key === 'notifset' && <NotifSetSheet ctx={ctx} />}
      {key === 'settings' && <SettingsSheet ctx={ctx} />}
      {key === 'info' && <InfoSheet />}
      {key === 'addcard' && <AddCardSheet ctx={ctx} />}
      {key === 'editcard' && <EditCardSheet ctx={ctx} id={arg} />}
      {key === 'addacc' && <AddAccSheet ctx={ctx} />}
      {key === 'erip' && <EripSheet ctx={ctx} />}
    </Sheet>
  );
}

function CoinChips({ value, onChange, list = COIN_KEYS }) {
  return (
    <div className="w-chips scroll">
      {list.map((a) => <button key={a} className={value === a ? 'on' : ''} onClick={() => onChange(a)}>{a}</button>)}
    </div>
  );
}

function AmountField({ value, onChange, cur }) {
  return (
    <label className="w-amount">
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label="Сумма" />
      <span>{cur}</span>
    </label>
  );
}

function DepositSheet({ ctx, initial }) {
  const { setD, setSheet, showToast, pushHist } = ctx;
  const [mode, setMode] = useState(initial === 'fiat' ? 'fiat' : 'crypto');
  const [a, setA] = useState('USDT');
  const [amount, setAmount] = useState('100');
  const topup = () => {
    const k = parseAmount(amount, 500000);
    if (!k) return showToast('Неверная сумма', 'От 0,01 до 5 000 BYN');
    setD((s) => pushHist({ ...s, fiat: s.fiat + k }, { type: 'in', title: 'Пополнение', sub: 'с карты Crypto •••• 1111', val: '+ ' + fmt(k) + ' BYN' }));
    setSheet(null);
    showToast('Счёт пополнен', '+' + fmt(k) + ' BYN на электронный счёт');
  };
  return (
    <>
      <div className="w-seg">
        <button className={mode === 'crypto' ? 'on' : ''} onClick={() => setMode('crypto')}>Криптовалютой</button>
        <button className={mode === 'fiat' ? 'on' : ''} onClick={() => setMode('fiat')}>BYN с карты</button>
      </div>
      {mode === 'crypto' ? (
        <>
          <CoinChips value={a} onChange={setA} />
          <QrSheet ctx={ctx} a={a} embedded />
        </>
      ) : (
        <>
          <div className="w-info-row"><span>Источник</span><b>Карта Crypto •••• 1111</b></div>
          <AmountField value={amount} onChange={setAmount} cur="BYN" />
          <div className="w-chips">{['50', '100', '300', '1000'].map((v) => <button key={v} onClick={() => setAmount(v)}>{v} BYN</button>)}</div>
          <button className="w-btn primary" onClick={topup}>Пополнить без комиссии</button>
        </>
      )}
    </>
  );
}

function QrSheet({ ctx, a, embedded }) {
  const { showToast } = ctx;
  const c = COINS[a];
  const cells = useMemo(() => {
    let x = [...c.addr].reduce((t, ch) => t * 31 + ch.charCodeAt(0), 7) & 0x7fffffff;
    return Array.from({ length: 21 * 21 }, (_, i) => {
      const r = Math.floor(i / 21);
      const col = i % 21;
      const finder = (rr, cc) => rr < 7 && cc < 7 && (rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr > 1 && rr < 5 && cc > 1 && cc < 5));
      if (finder(r, col) || finder(r, 20 - col) || finder(20 - r, col)) return true;
      if ((r < 8 && col < 8) || (r < 8 && col > 12) || (r > 12 && col < 8)) return false;
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x % 2 === 0;
    });
  }, [c.addr]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.addr); } catch (e) { /* нет доступа к буферу */ }
    showToast('Адрес скопирован', a + ' · ' + c.net);
  };
  return (
    <>
      <div className="w-qr">{cells.map((on, i) => <i key={i} style={{ background: on ? '#0C121D' : 'transparent' }} />)}</div>
      <div className="w-info-row"><span>Сеть</span><b>{c.net}</b></div>
      <button className="w-addr" onClick={copy}><span>{c.addr}</span><Icon name="copy" size={16} /></button>
      {!embedded && <span className="w-fine">Отправляйте на этот адрес только {a} в сети {c.net}</span>}
      {embedded && <span className="w-fine">Зачисление после подтверждения сети. Минимум: {cq(c.fee * 2, a)} {a}</span>}
    </>
  );
}

function WithdrawSheet({ ctx }) {
  const { d, setD, setSheet, showToast, pushHist } = ctx;
  const [a, setA] = useState('USDT');
  const [to, setTo] = useState('addr');
  const [addr, setAddr] = useState('');
  const [card, setCard] = useState(d.cards[0]?.id);
  const [amount, setAmount] = useState('10');
  const c = COINS[a];
  const submit = () => {
    const v = num(amount);
    if (!v) return showToast('Неверная сумма', 'Введите количество ' + a);
    if (v + c.fee > d.bal[a] + 1e-12) return showToast('Недостаточно ' + a, 'Доступно ' + cq(d.bal[a], a) + ' ' + a);
    if (to === 'addr' && addr.trim().length < 20) return showToast('Проверьте адрес', 'Адрес кошелька слишком короткий');
    const cd = d.cards.find((x) => x.id === card);
    if (to === 'card' && !cd) return showToast('Нет карты', 'Привяжите карту РБ в способах оплаты');
    const dest = to === 'card' ? cd.brand + ' •••• ' + cd.last : short(addr.trim());
    setD((s) => pushHist({ ...s, bal: { ...s.bal, [a]: s.bal[a] - v - c.fee } }, { type: 'out', title: 'Вывод', sub: 'на: ' + dest, val: '− ' + cq(v, a) + ' ' + a }));
    setSheet(null);
    showToast('Вывод отправлен', cq(v, a) + ' ' + a + ' на ' + dest);
  };
  return (
    <>
      <CoinChips value={a} onChange={setA} />
      <div className="w-seg">
        <button className={to === 'addr' ? 'on' : ''} onClick={() => setTo('addr')}>На адрес</button>
        <button className={to === 'card' ? 'on' : ''} onClick={() => setTo('card')}>На карту в BYN</button>
      </div>
      {to === 'addr' ? (
        <label className="w-field">
          <small>Адрес кошелька {a} · {c.net}</small>
          <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder={c.addr.slice(0, 4) + '…'} spellCheck={false} />
        </label>
      ) : (
        <div className="w-chips scroll">
          {d.cards.map((x) => <button key={x.id} className={card === x.id ? 'on' : ''} onClick={() => setCard(x.id)}>{x.brand} •••• {x.last}</button>)}
        </div>
      )}
      <AmountField value={amount} onChange={setAmount} cur={a} />
      <div className="w-info-row"><span>Доступно {cq(d.bal[a], a)} {a}</span><span>Комиссия сети {cq(c.fee, a)}</span></div>
      <button className="w-btn primary" onClick={submit}>Вывести{d.settings.twofa ? ' · код 2FA' : ''}</button>
    </>
  );
}

function ConvertSheet({ ctx }) {
  const { d, setD, R, showToast, pushHist } = ctx;
  const [from, setFrom] = useState('BTC');
  const [to, setTo] = useState('ETH');
  const [amount, setAmount] = useState('0,005');
  const [done, setDone] = useState(null);
  const v = num(amount);
  const got = from === to ? 0 : (v * priceByn(R, from) * 0.995) / priceByn(R, to);
  const submit = () => {
    if (from === to) return showToast('Выберите разные монеты', 'Например BTC → ETH');
    if (!v) return showToast('Неверная сумма', 'Введите количество ' + from);
    if (v > d.bal[from] + 1e-12) return showToast('Недостаточно ' + from, 'Доступно ' + cq(d.bal[from], from));
    setD((s) => pushHist({ ...s, bal: { ...s.bal, [from]: s.bal[from] - v, [to]: s.bal[to] + got } }, { type: 'conv', title: 'Конвертация ' + from + ' → ' + to, sub: 'электронный счёт', val: '+ ' + cq(got, to) + ' ' + to }));
    setDone({ from: cq(v, from) + ' ' + from, to: cq(got, to) + ' ' + to });
  };
  if (done) {
    return (
      <div className="w-success">
        <span className="w-success-ic"><Icon name="check" size={48} stroke={3} /></span>
        <span className="w-muted">Конвертация выполнена успешно</span>
        <b>{done.from}</b>
        <span className="w-swap static"><Icon name="swap" size={16} /></span>
        <b>{done.to}</b>
        <button className="w-btn soft" onClick={() => setDone(null)}>Ещё конвертация</button>
      </div>
    );
  }
  return (
    <>
      <span className="w-label">Отдаю</span>
      <CoinChips value={from} onChange={setFrom} />
      <AmountField value={amount} onChange={setAmount} cur={from} />
      <span className="w-hint">Доступно {cq(d.bal[from], from)} {from}</span>
      <span className="w-label">Получаю</span>
      <CoinChips value={to} onChange={setTo} />
      <div className="w-info-row"><span>Вы получите</span><b>{cq(got, to)} {to}</b></div>
      <div className="w-info-row"><span>Курс</span><span>1 {from} ≈ {from === to ? 1 : cq(priceByn(R, from) / priceByn(R, to), to)} {to} · спред 0,5%</span></div>
      <button className="w-btn primary" onClick={submit}>Конвертировать</button>
    </>
  );
}

function CoinSheet({ ctx, a }) {
  const { d, R, go, setSheet, setExPreset, coinUsd } = ctx;
  return (
    <>
      <div className="w-asset-hero">
        <Coin a={a} size={56} />
        <b>{cq(d.bal[a], a)} {a}</b>
        <span>≈ {usd(coinUsd(a, d.bal[a]))} · 1 {a} = {fmt(Math.round(priceByn(R, a) * 100))} BYN</span>
      </div>
      {ctx.kp.h[a]?.qty > 0 && <div className="w-info-row"><span>Куплено через KOPI</span><b className="acc">{cq(ctx.kp.h[a].qty, a)} {a}</b></div>}
      <div className="w-two">
        <button className="w-btn primary sm" onClick={() => { setExPreset({ k: Date.now(), dir: 'f2c', asset: a }); go('ex'); }}>Купить</button>
        <button className="w-btn soft sm" onClick={() => { setExPreset({ k: Date.now(), dir: 'c2f', asset: a }); go('ex'); }}>Продать</button>
      </div>
      <div className="w-two">
        <button className="w-btn soft sm" onClick={() => setSheet('deposit')}>Пополнить</button>
        <button className="w-btn soft sm" onClick={() => setSheet('withdraw')}>Вывести</button>
      </div>
    </>
  );
}

function FiatUsdSheet({ ctx }) {
  const { showToast, setSheet } = ctx;
  return (
    <>
      <span className="w-fine left">Счёт в USD открывается автоматически при первой продаже криптовалюты за доллары.</span>
      <button className="w-btn primary" onClick={() => { setSheet(null); showToast('Счёт в USD', 'Будет открыт при первой операции'); }}>Понятно</button>
    </>
  );
}

function NotifSheet({ ctx }) {
  const { d, setD, setSheet } = ctx;
  return (
    <>
      <div className="w-list panel">
        {d.hist.slice(0, 10).map((h) => <HistRow key={h.id} h={h} onClick={() => setSheet('op:' + h.id)} />)}
      </div>
      <button className="w-btn soft" onClick={() => setD((s) => ({ ...s, readAt: Date.now() }))}>Отметить все прочитанными</button>
    </>
  );
}

function HistFilterSheet({ ctx }) {
  const { d, setD, setSheet } = ctx;
  const cur = d.histStatus || 'all';
  return (
    <>
      <div className="w-menu">
        {[['all', 'Все статусы'], ['done', 'Завершено'], ['pending', 'В обработке'], ['fail', 'Отклонено']].map(([k, l]) => (
          <button key={k} className="w-menu-row" onClick={() => { setD((s) => ({ ...s, histStatus: k })); setSheet(null); }}>
            {k === 'all' ? <Icon name="grid" size={18} /> : <StatusIcon status={k} />}
            <span className="w-main"><span>{l}</span></span>
            {cur === k && <Icon name="check" size={18} className="acc" />}
          </button>
        ))}
      </div>
    </>
  );
}

function OpSheet({ ctx, id }) {
  const { d } = ctx;
  const h = d.hist.find((x) => x.id === id);
  if (!h) return null;
  const v = histView(h);
  const st = { pending: 'В обработке', fail: 'Отклонено' }[h.status] || 'Завершено';
  return (
    <>
      <div className="w-asset-hero">
        {v.coin ? <Coin a={v.coin} size={52} /> : <span className={'w-hist-ic lg' + (v.k ? ' k' : '')}>{v.k ? 'K' : <Icon name={v.icon} size={24} />}</span>}
        <b className={v.cls}>{v.val}</b>
        <span>{v.title}</span>
      </div>
      <div className="w-list panel">
        <div className="w-kv"><span>Детали</span><i /><b>{v.sub}</b></div>
        <div className="w-kv"><span>Дата</span><i /><b>{dayLabel(h.t)}, {timeOf(h.t)}</b></div>
        <div className="w-kv"><span>Статус</span><i /><b>{st}</b><StatusIcon status={h.status} /></div>
      </div>
    </>
  );
}

function SupportSheet() {
  const [msgs, setMsgs] = useState([{ me: false, text: 'Привет! Это поддержка WhiteBird. Выберите вопрос или напишите свой.' }]);
  const [text, setText] = useState('');
  const answers = {
    'Что такое KOPI?': 'KOPI округляет покупки по карте банка-партнёра и на сдачу покупает BTC, ETH или USDT в ваш кошелёк.',
    'Комиссия обмена': 'Комиссия сервиса — 3% (1,5% по промокоду KOPI). Итог показан до подтверждения.',
    'Сроки вывода': 'Вывод на карту — до часа, в блокчейн — после подтверждений сети.',
  };
  const send = (q) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { me: true, text: q }, { me: false, text: answers[q] || 'Спасибо! Оператор ответит в течение пары минут.' }]);
    setText('');
  };
  return (
    <>
      <div className="w-chat">{msgs.map((m, i) => <div key={i} className={'w-msg' + (m.me ? ' me' : '')}>{m.text}</div>)}</div>
      <div className="w-chips wrap">{Object.keys(answers).map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
      <form className="w-send" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение…" />
        <button type="submit" aria-label="Отправить"><Icon name="send" size={18} /></button>
      </form>
    </>
  );
}

function ReferralSheet({ ctx }) {
  const { showToast } = ctx;
  const link = 'https://whitebird.io/r/KOPI-4815';
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch (e) { /* нет доступа к буферу */ }
    showToast('Ссылка скопирована', 'Отправьте её другу');
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'WhiteBird', url: link }); return; } catch (e) { /* отменено */ }
    }
    copy();
  };
  return (
    <>
      <div className="w-rates">
        <div><small>Приглашено</small><b>2</b></div>
        <div><small>Заработано</small><b>12,40 USDT</b></div>
        <div><small>Ваш бонус</small><b>20%</b></div>
      </div>
      <button className="w-addr" onClick={copy}><span>{link}</span><Icon name="copy" size={16} /></button>
      <span className="w-fine left">Получайте 20% от комиссии сервиса с каждой операции приглашённого друга.</span>
      <button className="w-btn primary" onClick={share}>Поделиться ссылкой</button>
    </>
  );
}

function CryptoCardSheet({ ctx, variant }) {
  const { d, setD, setSheet, showToast } = ctx;
  const status = variant === 'status';
  return (
    <>
      <div className={'w-cardart' + (status ? ' status' : '')}>
        <span className="w-cc-top"><small>WHITEBIRD</small><b>{status ? 'Статусбанк' : 'A'}</b></span>
        <b>{status ? '₽ ₿' : 'CRYPTO'}</b>
        <small>Mastercard · цифровая карта</small>
      </div>
      <div className="w-list panel">
        <div className="w-kv"><span>Выпуск</span><i /><b>0 BYN</b></div>
        <div className="w-kv"><span>Обслуживание</span><i /><b>0 BYN</b></div>
        <div className="w-kv"><span>KOPI</span><i /><b>{status ? 'скоро' : 'поддерживается'}</b></div>
      </div>
      <button
        className="w-btn primary"
        onClick={() => {
          if (!status && d.cryptoCard) return showToast('Карта уже выпущена', 'Она привязана как •••• 1111');
          if (!status) setD((s) => ({ ...s, cryptoCard: true }));
          setSheet(null);
          showToast('Заявка на карту отправлена', status ? 'Статусбанк свяжется с вами' : 'Карта появится в приложении банка');
        }}
      >
        {!status && d.cryptoCard ? 'Карта выпущена' : 'Оформить карту'}
      </button>
    </>
  );
}

function PersonalSheet() {
  return (
    <div className="w-list panel">
      {[['Email', 'ale***@****'], ['Телефон', '+375 29 ••• 12 34'], ['Резидентство', 'Республика Беларусь'], ['Уровень', 'Верификация 2 · 30 000 BYN/мес']].map(([l, v]) => (
        <div key={l} className="w-kv"><span>{l}</span><i /><b>{v}</b></div>
      ))}
    </div>
  );
}

function SecuritySheet({ ctx }) {
  const { d, setD, showToast } = ctx;
  return (
    <div className="w-menu">
      <div className="w-menu-row static">
        <Icon name="lock" size={20} />
        <span className="w-main"><span>Двухфакторная защита</span><small>Код при входе и выводе</small></span>
        <Switch on={d.settings.twofa} onChange={(v) => { setD((s) => ({ ...s, settings: { ...s.settings, twofa: v } })); showToast(v ? '2FA включена' : '2FA отключена', v ? 'Код при каждом выводе' : 'Рекомендуем включить обратно'); }} label="2FA" />
      </div>
      <button className="w-menu-row" onClick={() => showToast('Письмо отправлено', 'Ссылка для смены пароля на ale***@****')}>
        <Icon name="shield" size={20} /><span className="w-main"><span>Сменить пароль</span></span><Icon name="right" size={18} className="w-chev" />
      </button>
      <button className="w-menu-row" onClick={() => showToast('Другие сеансы завершены', 'Активен только этот телефон')}>
        <Icon name="phone" size={20} /><span className="w-main"><span>Активные сеансы</span><small>2 устройства</small></span><Icon name="right" size={18} className="w-chev" />
      </button>
    </div>
  );
}

function NotifSetSheet({ ctx }) {
  const { d, setD } = ctx;
  const set = (k, v) => setD((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  return (
    <div className="w-menu">
      <div className="w-menu-row static"><Icon name="bell" size={20} /><span className="w-main"><span>Push-уведомления</span></span><Switch on={d.settings.push} onChange={(v) => set('push', v)} label="Push" /></div>
      <div className="w-menu-row static"><Icon name="send" size={20} /><span className="w-main"><span>Письма на email</span></span><Switch on={d.settings.email} onChange={(v) => set('email', v)} label="Email" /></div>
      <div className="w-menu-row static"><span className="w-k-mini">K</span><span className="w-main"><span>Покупки KOPI</span><small>Сообщать о пакетных покупках</small></span><Switch on={d.settings.kopi !== false} onChange={(v) => set('kopi', v)} label="KOPI" /></div>
    </div>
  );
}

function SettingsSheet({ ctx }) {
  const { d, setD } = ctx;
  return (
    <>
      <span className="w-label">Тема</span>
      <div className="w-seg">
        <button className={d.theme !== 'light' ? 'on' : ''} onClick={() => setD((s) => ({ ...s, theme: 'dark' }))}>Тёмная</button>
        <button className={d.theme === 'light' ? 'on' : ''} onClick={() => setD((s) => ({ ...s, theme: 'light' }))}>Светлая</button>
      </div>
      <div className="w-menu">
        <div className="w-menu-row static"><Icon name="lock" size={20} /><span className="w-main"><span>Скрывать баланс</span></span><Switch on={d.hideBalance} onChange={(v) => setD((s) => ({ ...s, hideBalance: v }))} label="Скрывать баланс" /></div>
        <button className="w-menu-row" onClick={() => setD((s) => ({ ...s, settings: { ...s.settings, lang: s.settings.lang === 'ru' ? 'en' : 'ru' } }))}>
          <Icon name="globe" size={20} /><span className="w-main"><span>Язык</span><small>{d.settings.lang === 'ru' ? 'Русский' : 'English (в концепте — подпись)'}</small></span><Icon name="right" size={18} className="w-chev" />
        </button>
      </div>
    </>
  );
}

function InfoSheet() {
  return (
    <>
      <div className="w-list panel">
        {[['Комиссия криптофиатного обмена', '3%'], ['По промокоду KOPI', '1,5%'], ['Конвертация', 'спред 0,5%'], ['Пополнение с карты', '0%'], ['Комиссия KOPI', '0% · только курс']].map(([l, v]) => (
          <div key={l} className="w-kv"><span>{l}</span><i /><b>{v}</b></div>
        ))}
      </div>
      <span className="w-fine left">Интерактивный концепт KOPI. Операции эмулируются, курсы BTC/ETH и USD/BYN — живые (НБРБ, Dzengi, CoinGecko).</span>
    </>
  );
}

function AddCardSheet({ ctx }) {
  const { d, setD, setSheet, showToast } = ctx;
  const [brand, setBrand] = useState('VISA');
  const [last, setLast] = useState('');
  const submit = () => {
    if (!/^\d{4}$/.test(last)) return showToast('Введите 4 цифры', 'Последние цифры номера карты');
    if (d.cards.some((c) => c.last === last)) return showToast('Карта уже привязана', '•••• ' + last);
    setD((s) => ({ ...s, cards: [...s.cards, { id: 'c' + Date.now(), brand, last, region: 'rb', note: 'Карта РБ', kopi: false }] }));
    setSheet(null);
    showToast('Карта привязана', brand + ' •••• ' + last);
  };
  return (
    <>
      <div className="w-seg">
        {['VISA', 'MC', 'БЕЛКАРТ'].map((b) => <button key={b} className={brand === b ? 'on' : ''} onClick={() => setBrand(b)}>{b === 'MC' ? 'Mastercard' : b}</button>)}
      </div>
      <label className="w-field">
        <small>Последние 4 цифры (демо — полный номер не нужен)</small>
        <input value={last} onChange={(e) => setLast(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="0000" />
      </label>
      <button className="w-btn primary" onClick={submit}>Привязать</button>
    </>
  );
}

function EditCardSheet({ ctx, id }) {
  const { d, setD, setSheet, showToast } = ctx;
  const c = d.cards.find((x) => x.id === id);
  const [note, setNote] = useState(c?.note || '');
  if (!c) return null;
  return (
    <>
      <div className="w-info-row"><span>{c.brand}</span><b>•••• •••• •••• {c.last}</b></div>
      <label className="w-field">
        <small>Название карты</small>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="w-btn primary" onClick={() => { setD((s) => ({ ...s, cards: s.cards.map((x) => (x.id === id ? { ...x, note } : x)) })); setSheet(null); showToast('Сохранено', note); }}>Сохранить</button>
    </>
  );
}

function AddAccSheet({ ctx }) {
  const { setD, setSheet, showToast } = ctx;
  const [iban, setIban] = useState('BY');
  const submit = () => {
    const v = iban.replace(/\s/g, '').toUpperCase();
    if (!/^BY\d{2}[A-Z0-9]{24}$/.test(v)) return showToast('Проверьте номер счёта', 'Формат BY + 26 символов');
    setD((s) => ({ ...s, accounts: [...s.accounts, { id: 'a' + Date.now(), iban: v.replace(/(.{4})/g, '$1 ').trim(), bank: 'Банк РБ' }] }));
    setSheet(null);
    showToast('Счёт добавлен', v.slice(0, 8) + '…');
  };
  return (
    <>
      <label className="w-field">
        <small>IBAN</small>
        <input value={iban} onChange={(e) => setIban(e.target.value)} spellCheck={false} placeholder="BY20 ALFA 3014 …" />
      </label>
      <button className="w-btn primary" onClick={submit}>Добавить</button>
    </>
  );
}

function EripSheet({ ctx }) {
  const { showToast, setSheet } = ctx;
  return (
    <>
      <div className="w-list panel">
        <div className="w-kv"><span>Путь в ЕРИП</span><i /><b>Финансовые услуги → Криптобиржи → WhiteBird</b></div>
        <div className="w-kv"><span>Номер договора</span><i /><b>4815162</b></div>
      </div>
      <button className="w-btn primary" onClick={() => { setSheet(null); showToast('Номер договора скопирован', '4815162'); try { navigator.clipboard.writeText('4815162'); } catch (e) { /* ignore */ } }}>Скопировать номер договора</button>
    </>
  );
}
