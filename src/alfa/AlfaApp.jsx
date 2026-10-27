import { useEffect, useState } from 'react';
import { fmt } from '../shared/format.js';
import { FALLBACK, useRates } from '../shared/rates.js';
import { usePersisted, useToast, useArmed } from '../shared/hooks.js';
import { useKopi, kopiOp, kopiRound, kopiValue, kq, resetKopi } from '../shared/kopi.js';
import { Icon, Solid } from '../shared/icons.jsx';
import { Phone, Toast } from '../shared/ui.jsx';
import { ALFA_KEY, fresh, isValid, applyPay } from './model.js';
import { WB_KEY } from '../whitebird/model.js';
import { Home, Payments, History, Dialogs, Showcase, Chat, Kopi, Profile, Logo } from './screens.jsx';
import { Subscriptions, AddAuto, AddFromHistory, RegForm } from './regular.jsx';
import { SheetHost } from './sheets.jsx';
import './alfa.css';

const LAYERS = ['subs', 'addAuto', 'addHist', 'regForm', 'kopi', 'chat', 'profile'];
const NAV = [
  ['pay', 'pay', 'Платежи'],
  ['hist', 'clock', 'История'],
  ['home', null, 'Главная'],
  ['dialogs', 'chat', 'Диалоги'],
  ['shop', 'grid', 'Витрина'],
];

export default function AlfaApp() {
  const [raw, setD] = usePersisted(ALFA_KEY, fresh, isValid);
  const [k, setK] = useKopi();
  const rates = useRates();
  const R = rates || FALLBACK;
  // Настройки сдачи живут в общей связке KOPI; без подключения сдачи нет (множитель 0).
  const d = { ...raw, step: k.step, mult: k.linked ? k.mult : 0, asset: k.asset };
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // экраны поверх вкладок
  const [sheet, setSheet] = useState(null);
  const [done, setDone] = useState(null);
  const [locked, setLocked] = useState(false);
  const [toast, showToast] = useToast();
  const [resetArmed, armReset] = useArmed();

  const commit = (fn) => setD(fn);
  const go = (t) => { setTab(t); setStack([]); setSheet(null); };
  const push = (screen) => { setStack((st) => [...st.filter((x) => x.id !== screen.id), screen]); setSheet(null); };
  const pop = () => setStack((st) => st.slice(0, -1));
  const toSubs = () => { setStack([{ id: 'subs' }]); setSheet(null); };

  const p = kopiValue(k, R);

  // Переход из WhiteBird кнопкой «Оплатить картой в Альфа Банке» — сразу на экран KOPI.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('kopi.open') === 'alfa') { sessionStorage.removeItem('kopi.open'); push({ id: 'kopi' }); }
    } catch (e) { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** items: [{ name, a, kopi, cat, regId }] — оплата с экраном «Оплачено успешно». Сдача сразу уходит в WhiteBird и покупает монету. */
  const payMany = (items) => {
    const need = items.reduce((t, x) => t + x.a + (x.kopi === false ? 0 : kopiRound(k, x.a)), 0);
    if (need > raw.balance) return showToast('Недостаточно средств', 'На карте ' + fmt(raw.balance) + ' BYN — пополните её');
    let n = raw;
    let total = 0;
    const rows = [];
    const kops = [];
    const t = Date.now();
    items.forEach((x, i) => {
      const op = x.kopi === false ? null : kopiOp(k, R, x.name, x.a, t + i * 2);
      n = applyPay(n, x.name, x.a, t + i * 2, op ? op.roundup : 0, x.cat, x.regId);
      if (op) kops.unshift(op);
      total += x.a;
      rows.push({ name: x.name, amt: fmt(x.a) + ' BYN', kopi: op ? '+' + fmt(op.roundup) + ' BYN → WhiteBird' : 'без сдачи' });
    });
    const kopi = kops.reduce((s, o) => s + o.roundup, 0);
    const got = kops.reduce((s, o) => s + o.qty, 0);
    setD(n);
    if (kops.length) setK((s) => ({ ...s, ops: [...kops, ...s.ops] }));
    setSheet(null);
    setDone({
      total: fmt(total) + ' BYN',
      rows,
      kopi: kopi ? '+' + fmt(kopi) + ' BYN' : null,
      note: kopi
        ? 'Сдача переведена в WhiteBird и сразу обменяна: +' + kq(got, k.asset) + ' ' + k.asset + ' в вашем кошельке.'
        : k.linked ? 'Сдачи нет: сумма уже круглая.' : 'Подключите KOPI — и сдача с каждой покупки будет превращаться в криптовалюту в WhiteBird.',
    });
  };

  const reset = () =>
    armReset(() => {
      setD(fresh());
      resetKopi();
      try { localStorage.removeItem(ALFA_KEY); localStorage.removeItem(WB_KEY); } catch (e) { /* приватный режим */ }
      go('home');
      showToast('Демо сброшено', 'Всё с нуля: пополните карту и подключите KOPI');
    });

  const ctx = {
    d, setD, k, setK, R, p, tab, go, push, pop, toSubs, stack, commit, sheet, setSheet, showToast, payMany, reset, resetArmed, setLocked,
  };
  const unread = k.ops.filter((o) => o.t > raw.readAt).length;
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
        {done?.kopi && (
          <div className="a-row static">
            <span className="a-sq kopi sm">K</span>
            <span className="a-row-main"><span><b>Сдача в KOPI</b></span><small>Переведена в WhiteBird</small></span>
            <b className="k">{done.kopi}</b>
          </div>
        )}
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
