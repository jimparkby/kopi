import { useState } from 'react';
import { fmt, qty, roundUp } from '../shared/format.js';
import { FALLBACK, useRates } from '../shared/rates.js';
import { usePersisted, useToast, useArmed } from '../shared/hooks.js';
import { Icon, Solid } from '../shared/icons.jsx';
import { Phone, Toast } from '../shared/ui.jsx';
import { ALFA_KEY, ASSETS, seed, isValid, applyPay, applyBuy, portfolio } from './model.js';
import { Home, Payments, History, Dialogs, Showcase, Chat, Kopi, Profile, Logo } from './screens.jsx';
import { Subscriptions, AddAuto, AddFromHistory, RegForm } from './regular.jsx';
import { SheetHost } from './sheets.jsx';
import './alfa.css';

// При первом живом курсе пересобираем демо чуть ниже рынка, чтобы портфель был в плюсе.
const discounted = (r) => ({ ...r, BTC: r.BTC * 0.985, ETH: r.ETH * 0.98 });
const LAYERS = ['subs', 'addAuto', 'addHist', 'regForm', 'kopi', 'chat', 'profile'];
const NAV = [
  ['pay', 'pay', 'Платежи'],
  ['hist', 'clock', 'История'],
  ['home', null, 'Главная'],
  ['dialogs', 'chat', 'Диалоги'],
  ['shop', 'grid', 'Витрина'],
];

export default function AlfaApp() {
  const [d, setD] = usePersisted(ALFA_KEY, () => seed(FALLBACK), isValid);
  const rates = useRates((r) =>
    setD((s) => (s.seeded && !s.reseeded ? { ...seed(discounted(r)), reseeded: true } : s)),
  );
  const R = rates || FALLBACK;
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // экраны поверх вкладок
  const [sheet, setSheet] = useState(null);
  const [done, setDone] = useState(null);
  const [locked, setLocked] = useState(false);
  const [toast, showToast] = useToast();
  const [resetArmed, armReset] = useArmed();

  // Любое действие пользователя снимает флаг «демо-данные», чтобы живой курс их не перезаписал.
  const commit = (fn) => setD((s) => ({ ...fn(s), seeded: false }));
  const go = (t) => { setTab(t); setStack([]); setSheet(null); };
  const push = (screen) => { setStack((st) => [...st.filter((x) => x.id !== screen.id), screen]); setSheet(null); };
  const pop = () => setStack((st) => st.slice(0, -1));
  const toSubs = () => { setStack([{ id: 'subs' }]); setSheet(null); };

  const p = portfolio(d, R);

  const buyNote = (b) =>
    'Копилка набрала ' + fmt(b.amount) + ' BYN: куплено ' +
    (b.asset === 'SAFE' ? 'консервативного инструмента' : qty(b.qty, b.asset) + ' ' + b.asset) + ' одним пакетом.';

  /** items: [{ name, a, kopi, cat, regId }] — оплата одного или нескольких платежей с экраном «Оплачено успешно». */
  const payMany = (items) => {
    const need = items.reduce((t, x) => t + x.a + (x.kopi === false ? 0 : roundUp(x.a, d.step, d.mult)), 0);
    if (need > d.balance) return showToast('Недостаточно средств', 'На карте ' + fmt(d.balance) + ' BYN');
    let n = { ...d, seeded: false };
    let kopi = 0;
    let total = 0;
    const rows = [];
    const buys = [];
    const t = Date.now();
    items.forEach((x, i) => {
      const r = applyPay(n, x.name, x.a, t + i * 2, R, x.kopi !== false, x.cat, x.regId);
      n = r.s;
      kopi += r.roundup;
      total += x.a;
      if (r.purchase) buys.push(r.purchase);
      rows.push({ name: x.name, amt: fmt(x.a) + ' BYN', kopi: r.roundup ? '+' + fmt(r.roundup) + ' в KOPI' : 'без сдачи' });
    });
    const note = buys.length
      ? buyNote(buys[buys.length - 1])
      : kopi
        ? 'До покупки ' + ASSETS[n.asset].code + ' осталось ' + fmt(Math.max(0, n.threshold - n.piggy)) + ' BYN.'
        : 'Сдачи нет: сумма круглая или округление выключено.';
    setD(n);
    setSheet(null);
    setDone({ total: fmt(total) + ' BYN', rows, kopi: '+' + fmt(kopi) + ' BYN', note });
  };

  const buyNow = () => {
    if (d.piggy <= 0) return showToast('Копилка пуста', 'Оплатите картой — сдача уйдёт в KOPI');
    const r = applyBuy({ ...d, seeded: false }, R, Date.now());
    setD(r.s);
    showToast('KOPI: куплено на ' + fmt(r.p.amount) + ' BYN', r.p.asset === 'SAFE' ? 'Консервативный инструмент' : qty(r.p.qty, r.p.asset) + ' ' + r.p.asset);
  };

  const reset = () =>
    armReset(() => {
      setD({ ...seed(rates ? discounted(rates) : FALLBACK), reseeded: !!rates });
      go('home');
      showToast('Демо сброшено', 'Снова неделя покупок');
    });

  const ctx = {
    d, setD, R, p, tab, go, push, pop, toSubs, stack, commit, sheet, setSheet, showToast, payMany, buyNow, reset, resetArmed, setLocked,
  };
  const unread = d.hist.filter((h) => h.t > d.readAt).length;
  const blueTop = tab !== 'shop' && stack.length === 0;

  return (
    <Phone theme="alfa">
      <div className={'a-statusbg' + (blueTop ? ' blue' : '')} />
      <div className="a-body" key={tab}>
        {tab === 'home' && <Home ctx={ctx} />}
        {tab === 'pay' && <Payments ctx={ctx} />}
        {tab === 'hist' && <History ctx={ctx} />}
        {tab === 'dialogs' && <Dialogs ctx={ctx} />}
        {tab === 'shop' && <Showcase ctx={ctx} />}
      </div>

      <nav className="a-nav">
        {NAV.map(([id, icon, label]) => (
          <button key={id} className={'a-nav-btn' + (tab === id && stack.length === 0 ? ' on' : '')} onClick={() => go(id)} aria-label={label}>
            {icon ? <Solid name={icon} size={24} /> : <span className="a-nav-logo"><b>A</b><i /></span>}
            <span className="a-nav-label">{label}</span>
            {id === 'dialogs' && unread > 0 && <span className="a-nav-dot" />}
          </button>
        ))}
      </nav>

      {LAYERS.map((id) => {
        const s = stack.find((x) => x.id === id);
        return (
          <div key={id} className={'a-layer' + (s ? ' on' : '')} aria-hidden={!s} style={{ zIndex: s ? 8 + stack.indexOf(s) : 8 }}>
            {s && (
              <>
                {id === 'subs' && <Subscriptions ctx={ctx} />}
                {id === 'addAuto' && <AddAuto ctx={ctx} />}
                {id === 'addHist' && <AddFromHistory ctx={ctx} screen={s} />}
                {id === 'regForm' && <RegForm ctx={ctx} screen={s} key={JSON.stringify(s)} />}
                {id === 'kopi' && <Kopi ctx={ctx} />}
                {id === 'chat' && <Chat ctx={ctx} />}
                {id === 'profile' && <Profile ctx={ctx} />}
              </>
            )}
          </div>
        );
      })}

      <Done done={done} onClose={() => setDone(null)} />
      <Lock locked={locked} onUnlock={() => { setLocked(false); showToast('С возвращением, Алексей', 'Вход выполнен'); }} />
      <Toast toast={toast} badge="A" />
      <SheetHost ctx={ctx} />
    </Phone>
  );
}

/* Оплачено успешно */
function Done({ done, onClose }) {
  return (
    <div className={'a-done' + (done ? ' on' : '')} aria-hidden={!done}>
      <button className="a-done-x" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
      <div className="a-done-head">
        <span className="a-done-ok"><Icon name="check" size={34} stroke={3} /></span>
        <b>Оплачено успешно</b>
        <span className="a-muted">Балансы счетов обновятся в ближайшее время</span>
        <strong>{done?.total}</strong>
      </div>
      <div className="a-card a-list">
        {done?.rows.map((r, i) => (
          <div key={i} className="a-row static">
            <span className="a-glyph ok"><Icon name="check" size={14} stroke={3} /></span>
            <span className="a-row-main"><span>{r.name}</span><small className="k">{r.kopi}</small></span>
            <b>{r.amt}</b>
          </div>
        ))}
        <div className="a-row static">
          <span className="a-sq kopi sm">K</span>
          <span className="a-row-main"><span><b>Сдача в KOPI</b></span></span>
          <b className="k">{done?.kopi}</b>
        </div>
      </div>
      <p className="a-done-note">{done?.note}</p>
      <div style={{ flex: 1 }} />
      <button className="a-btn red" onClick={onClose}>Готово</button>
    </div>
  );
}

/* Экран входа после «Выйти» */
function Lock({ locked, onUnlock }) {
  const [pin, setPin] = useState('');
  const press = (n) => {
    const v = (pin + n).slice(0, 4);
    setPin(v);
    if (v.length === 4) setTimeout(() => { setPin(''); onUnlock(); }, 200);
  };
  return (
    <div className={'a-lock' + (locked ? ' on' : '')} aria-hidden={!locked}>
      <Logo size={44} />
      <b>Введите код доступа</b>
      <span className="a-pin">{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</span>
      <div className="a-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => <button key={n} onClick={() => press(n)}>{n}</button>)}
        <button onClick={() => { setPin(''); onUnlock(); }} aria-label="Face ID"><Icon name="user" size={24} /></button>
        <button onClick={() => press('0')}>0</button>
        <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Стереть"><Icon name="left" size={24} /></button>
      </div>
      <small>Демо: любые 4 цифры или Face ID</small>
    </div>
  );
}
