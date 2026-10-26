import { useMemo, useState } from 'react';
import { fmt, fmtInt, pct, qty, when, parseAmount, roundUp } from '../shared/format.js';
import { FALLBACK, useRates } from '../shared/rates.js';
import { usePersisted, useToast, useArmed } from '../shared/hooks.js';
import { Icon } from '../shared/icons.jsx';
import { Phone, Toast, Sheet, Switch } from '../shared/ui.jsx';
import {
  ALFA_KEY, ASSETS, ASSET_KEYS, TPL, SUBS, PRESETS, PRODUCTS, BRANCHES, CONTACTS,
  seed, isValid, applyPay, applyBuy, portfolio, nextCharge,
} from './model.js';
import './alfa.css';

const GREEN = '#21A038';
const RED = '#EF3124';
const dateLong = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
// При первом живом курсе пересобираем демо чуть ниже рынка, чтобы портфель был в плюсе.
const discounted = (r) => ({ ...r, BTC: r.BTC * 0.985, ETH: r.ETH * 0.98 });

export default function AlfaApp() {
  const [d, setD] = usePersisted(ALFA_KEY, () => seed(FALLBACK), isValid);
  const rates = useRates((r) =>
    setD((s) => (s.seeded && !s.reseeded ? { ...seed(discounted(r)), reseeded: true } : s)),
  );
  const R = rates || FALLBACK;
  const [tab, setTab] = useState('home');
  const [paySeg, setPaySeg] = useState('tpl');
  const [histFilter, setHistFilter] = useState('all');
  const [sheet, setSheet] = useState(null);
  const [done, setDone] = useState(null);
  const [toast, showToast] = useToast();
  const [resetArmed, armReset] = useArmed();

  // Любое действие пользователя снимает флаг «демо-данные», чтобы живой курс их не перезаписал.
  const commit = (fn) => setD((s) => ({ ...fn(s), seeded: false }));
  const go = (t, seg) => {
    setTab(t);
    if (seg) setPaySeg(seg);
    setSheet(null);
  };

  const p = portfolio(d, R);
  const A = ASSETS[d.asset];
  const pp = Math.min(100, (d.piggy / d.threshold) * 100);

  const buyNote = (b) =>
    'Копилка набрала ' + fmt(b.amount) + ' BYN: куплено ' +
    (b.asset === 'SAFE' ? 'консервативного инструмента' : qty(b.qty, b.asset) + ' ' + b.asset) + ' одним пакетом.';

  /** items: [{ name, a, kopi }] */
  const payMany = (items) => {
    const need = items.reduce((t, x) => t + x.a + (x.kopi === false ? 0 : roundUp(x.a, d.step, d.mult)), 0);
    if (need > d.balance) return showToast('Недостаточно средств', 'На карте Classic ' + fmt(d.balance) + ' BYN');
    let n = { ...d, seeded: false };
    let kopi = 0;
    let total = 0;
    const rows = [];
    const buys = [];
    const t = Date.now();
    items.forEach((x, i) => {
      const r = applyPay(n, x.name, x.a, t + i * 2, R, x.kopi !== false);
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
    showToast(
      'KOPI: куплено на ' + fmt(r.p.amount) + ' BYN',
      r.p.asset === 'SAFE' ? 'Консервативный инструмент' : qty(r.p.qty, r.p.asset) + ' ' + r.p.asset,
    );
  };

  const reset = () =>
    armReset(() => {
      setD({ ...seed(rates ? discounted(rates) : FALLBACK), reseeded: !!rates });
      setTab('home');
      showToast('Демо сброшено', 'Снова неделя покупок');
    });

  const lastRound = d.hist.find((h) => h.type === 'round');
  const unread = d.hist.filter((h) => h.t > d.readAt).length;
  const activeSubs = SUBS.filter((s) => d.subs[s.id]?.active);
  const subsTotal = activeSubs.reduce((t, s) => t + s.amt, 0);
  const subsKopi = activeSubs.reduce((t, s) => t + (d.subs[s.id].kopi ? roundUp(s.amt, d.step, d.mult) : 0), 0);
  const nextSub = activeSubs.map((s) => ({ ...s, next: nextCharge(s.day) })).sort((a, b) => a.next - b.next)[0];

  const ctx = {
    d, R, p, A, pp, go, tab, commit, setSheet, showToast, payMany, buyNow, reset, resetArmed,
    paySeg, setPaySeg, histFilter, setHistFilter, lastRound, unread,
    activeSubs, subsTotal, subsKopi, nextSub, setD,
  };

  return (
    <Phone theme="alfa">
        <div className="a-body">
          {tab === 'home' && <Home ctx={ctx} />}
          {tab === 'pay' && <Payments ctx={ctx} />}
          {tab === 'kopi' && <Kopi ctx={ctx} />}
          {tab === 'hist' && <History ctx={ctx} />}
          {tab === 'cab' && <Cabinet ctx={ctx} />}
        </div>

        {tab === 'pay' && paySeg === 'tpl' && <PayBar ctx={ctx} />}

        <nav className="a-nav">
          <NavBtn on={tab === 'pay'} icon="card" label="Платежи" onClick={() => go('pay')} />
          <NavBtn on={tab === 'hist'} icon="clock" label="История" onClick={() => go('hist')} />
          <button className={'a-nav-btn home' + (tab === 'home' ? ' on' : '')} onClick={() => go('home')}>
            <span className="a-logo-mark"><b>A</b><i /></span>
            Главная
          </button>
          <button className={'a-nav-btn' + (tab === 'kopi' ? ' on kopi' : '')} onClick={() => go('kopi')}>
            <span className="a-k-mark">K</span>
            KOPI
            <span className="a-new">NEW</span>
          </button>
          <NavBtn on={tab === 'cab'} icon="user" label="Кабинет" onClick={() => go('cab')} />
        </nav>

        <Done done={done} onClose={() => setDone(null)} />
        <Toast toast={toast} badge="K" />
        <SheetHost ctx={ctx} sheet={sheet} />
      </Phone>
  );
}

function NavBtn({ on, icon, label, onClick }) {
  return (
    <button className={'a-nav-btn' + (on ? ' on' : '')} onClick={onClick}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}

function Ring({ pctValue, size = 52, label }) {
  return (
    <span
      className="a-ring"
      style={{ width: size, height: size, background: `conic-gradient(var(--kopi) ${pctValue}%, var(--line-strong) 0)` }}
    >
      <span style={{ width: size - 10, height: size - 10 }}>{label}</span>
    </span>
  );
}

/* ───────────────────────── Главная ───────────────────────── */
function Home({ ctx }) {
  const { d, p, A, pp, go, setSheet, buyNow, lastRound, unread, activeSubs, subsTotal, nextSub, payMany } = ctx;
  const tpl = (id) => TPL.find((t) => t.id === id);
  return (
    <div className="a-screen">
      <header className="a-top">
        <button className="a-avatar" onClick={() => go('cab')} aria-label="Кабинет">АК</button>
        <div className="a-top-actions">
          <button className="a-icon-btn" onClick={() => setSheet('search')} aria-label="Поиск">
            <Icon name="search" />
          </button>
          <button className="a-icon-btn" onClick={() => setSheet('notif')} aria-label="Уведомления">
            <Icon name="bell" />
            {unread > 0 && <span className="a-dot">{unread > 9 ? '9+' : unread}</span>}
          </button>
        </div>
      </header>

      <section className="a-account">
        <button className="a-account-main" onClick={() => go('hist')}>
          <span className="a-mini-card" />
          <span className="a-account-text">
            <span className="a-muted">Текущий счёт · Classic</span>
            <b className="a-balance">{fmt(d.balance)} <small>BYN</small></b>
            <span className="a-muted">USD-счёт {fmt(d.usd)} $</span>
          </span>
          <Icon name="right" size={18} className="a-chev" />
        </button>
        <div className="a-account-actions">
          <RoundAction icon="plus" label="Пополнить" onClick={() => setSheet('topup')} />
          <RoundAction icon="send" label="Перевести" onClick={() => setSheet('transfer')} />
          <RoundAction icon="bag" label="Оплатить" onClick={() => setSheet('shop')} />
          <RoundAction icon="qr" label="QR-код" onClick={() => setSheet('qr')} />
        </div>
      </section>

      <div className="a-quick">
        <QuickTile icon="grid" label="Оформить продукт" onClick={() => setSheet('product')} />
        <QuickTile icon="swap" label="Обменять валюту" onClick={() => setSheet('exchange')} />
        <QuickTile kopi label="Крипто со сдачи" onClick={() => go('kopi')} />
        <QuickTile icon="pin" label="Найти банк на карте" onClick={() => setSheet('map')} />
      </div>

      <section className="a-card a-kopi-widget">
        <button className="a-kw-head" onClick={() => go('kopi')}>
          <span className="a-k-badge">K</span>
          <span className="a-kw-text">
            <span className="a-muted">KOPI · портфель со сдачи</span>
            <b>{fmt(p.value)} BYN</b>
          </span>
          <span className="a-pill" style={{ color: p.pr >= 0 ? GREEN : RED }}>{p.invested ? pct(p.pr) : '—'}</span>
        </button>
        <div className="a-kw-row">
          <Ring pctValue={pp} label={Math.round(pp) + '%'} />
          <div className="a-kw-piggy">
            <b>{fmt(d.piggy)} из {fmtInt(d.threshold)} BYN</b>
            <span className="a-muted">копилка → покупка {A.code}</span>
          </div>
        </div>
        <div className="a-kw-actions">
          <button className="a-btn ghost" onClick={() => setSheet('shop')}>
            <Icon name="bag" size={18} /> В магазине
          </button>
          <button className="a-btn ghost" onClick={buyNow} disabled={d.piggy <= 0}>
            <span className="a-coin" style={{ background: A.bg }}>{A.sym}</span> Купить {A.code}
          </button>
        </div>
      </section>

      <section className="a-card a-subs-widget" onClick={() => go('pay', 'subs')} role="button" tabIndex={0}>
        <div className="a-sw-head">
          <b>Подписки</b>
          <Icon name="right" size={18} className="a-chev" />
        </div>
        <div className="a-sw-body">
          <span className="a-stack">
            {activeSubs.slice(0, 4).map((s) => (
              <span key={s.id} style={{ background: s.color }}>{s.glyph}</span>
            ))}
          </span>
          <span className="a-sw-text">
            <b>{fmt(subsTotal)} BYN в месяц</b>
            <span className="a-muted">
              {activeSubs.length} активных{nextSub ? ' · ближайшая ' + dateLong(nextSub.next) : ''}
            </span>
          </span>
        </div>
      </section>

      <section className="a-card a-utils">
        <div className="a-sw-head">
          <b>Коммуналка</b>
          <button className="a-link" onClick={() => go('pay', 'tpl')}>Все шаблоны</button>
        </div>
        <div className="a-utils-row">
          {['gas', 'light', 'water'].map((id) => (
            <button key={id} className="a-util" onClick={() => payMany([{ name: tpl(id).name, a: tpl(id).amt }])}>
              <span style={{ background: tpl(id).color }}>{tpl(id).glyph}</span>
              <b>{tpl(id).name}</b>
              <small>{fmt(tpl(id).amt)}</small>
            </button>
          ))}
        </div>
      </section>

      <button className="a-last" onClick={() => go('kopi')}>
        <span className="a-k-dot" />
        <span>
          {lastRound
            ? 'KOPI: ' + lastRound.merchant + ' ' + fmt(lastRound.a) + ' → ' + fmt(lastRound.rounded) + ', в копилку +' + fmt(lastRound.roundup) + ' BYN'
            : 'Оплатите картой — сдача уйдёт в KOPI'}
        </span>
      </button>
    </div>
  );
}

function RoundAction({ icon, label, onClick }) {
  return (
    <button className="a-ra" onClick={onClick}>
      <span><Icon name={icon} size={20} /></span>
      {label}
    </button>
  );
}

function QuickTile({ icon, label, onClick, kopi }) {
  return (
    <button className={'a-qt' + (kopi ? ' kopi' : '')} onClick={onClick}>
      {kopi ? <span className="a-k-mark solid">K</span> : <Icon name={icon} size={22} />}
      <span>{label}</span>
    </button>
  );
}

/* ───────────────────────── Платежи / Подписки ───────────────────────── */
function Payments({ ctx }) {
  const { paySeg, setPaySeg } = ctx;
  return (
    <div className="a-screen">
      <header className="a-title-row">
        <h2>Платежи</h2>
      </header>
      <div className="a-seg">
        <button className={paySeg === 'tpl' ? 'on' : ''} onClick={() => setPaySeg('tpl')}>Шаблоны</button>
        <button className={paySeg === 'subs' ? 'on' : ''} onClick={() => setPaySeg('subs')}>Подписки</button>
      </div>
      {paySeg === 'tpl' ? <Templates ctx={ctx} /> : <Subscriptions ctx={ctx} />}
    </div>
  );
}

function Templates({ ctx }) {
  const { d, commit, setSheet } = ctx;
  const preview = (a) => roundUp(a, d.step, d.mult);
  const selT = TPL.filter((t) => d.sel.includes(t.id));
  const selKopi = selT.reduce((t, x) => t + preview(x.amt), 0);
  const toggle = (id) => commit((s) => ({ ...s, sel: s.sel.includes(id) ? s.sel.filter((x) => x !== id) : [...s.sel, id] }));
  return (
    <div className="a-tpl-wrap">
      <div className="a-tpl-grid">
        {TPL.map((t) => {
          const on = d.sel.includes(t.id);
          return (
            <button key={t.id} className={'a-tpl' + (on ? ' on' : '')} onClick={() => toggle(t.id)} aria-pressed={on}>
              <span className="a-tpl-top">
                <span className="a-glyph" style={{ background: t.color }}>{t.glyph}</span>
                {on ? <span className="a-check"><Icon name="check" size={14} stroke={3} /></span> : preview(t.amt) > 0 && <span className="a-tpl-k">+{fmt(preview(t.amt))}</span>}
              </span>
              <span className="a-tpl-name">{t.name}</span>
              <span className="a-tpl-price">{fmt(t.amt)} BYN</span>
            </button>
          );
        })}
        <button className="a-tpl dashed" onClick={() => setSheet('shop')}>
          <span className="a-glyph" style={{ background: '#F0277A' }}><Icon name="bag" size={16} /></span>
          <span className="a-tpl-name">Оплата в магазине</span>
          <span className="a-tpl-price">эмулятор кассы</span>
        </button>
      </div>
      <p className="a-hint-c">
        {selT.length ? 'Сдача с выбранных платежей: +' + fmt(selKopi) + ' BYN в KOPI' : 'Выберите шаблоны для оплаты'}
      </p>
    </div>
  );
}

function PayBar({ ctx }) {
  const { d, payMany } = ctx;
  const selT = TPL.filter((t) => d.sel.includes(t.id));
  const sum = selT.reduce((t, x) => t + x.amt, 0);
  return (
    <div className="a-paybar">
      <button className="a-btn primary" disabled={!selT.length} onClick={() => payMany(selT.map((t) => ({ name: t.name, a: t.amt })))}>
        {selT.length ? 'Перейти к оплате · ' + fmt(sum) + ' BYN' : 'Перейти к оплате'}
      </button>
    </div>
  );
}

function Subscriptions({ ctx }) {
  const { d, setSheet, subsTotal, subsKopi, activeSubs } = ctx;
  const [view, setView] = useState('active');
  const today = new Date();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const x = new Date(today);
    x.setDate(today.getDate() + i);
    return x;
  }), [today.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const chargeOn = (x) => activeSubs.filter((s) => s.day === x.getDate());
  const list = SUBS.filter((s) => (view === 'active' ? d.subs[s.id]?.active : !d.subs[s.id]?.active))
    .map((s) => ({ ...s, next: nextCharge(s.day) }))
    .sort((a, b) => a.next - b.next);

  return (
    <div className="a-subs">
      <section className="a-subs-hero">
        <span className="a-muted-inv">Списания в месяц</span>
        <b>{fmt(subsTotal)} BYN</b>
        <span className="a-subs-meta">
          {activeSubs.length} активных · сдача в KOPI <em>+{fmt(subsKopi)} BYN</em>
        </span>
        <div className="a-cal">
          {days.map((x) => {
            const c = chargeOn(x);
            const isToday = x.toDateString() === today.toDateString();
            return (
              <button
                key={x.toISOString()}
                className={'a-cal-day' + (c.length ? ' has' : '') + (isToday ? ' today' : '')}
                onClick={() => (c.length ? setSheet('sub:' + c[0].id) : null)}
                disabled={!c.length}
                title={c.map((s) => s.name).join(', ')}
              >
                <small>{x.toLocaleDateString('ru-RU', { weekday: 'short' })}</small>
                <b>{x.getDate()}</b>
                <span className="a-cal-dots">
                  {c.map((s) => <i key={s.id} style={{ background: s.color }} />)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="a-chips">
        <button className={view === 'active' ? 'on' : ''} onClick={() => setView('active')}>Активные</button>
        <button className={view === 'paused' ? 'on' : ''} onClick={() => setView('paused')}>Приостановленные</button>
      </div>

      <div className="a-card a-list">
        {list.length === 0 && <div className="a-empty">Здесь пока пусто</div>}
        {list.map((s) => (
          <button key={s.id} className="a-row" onClick={() => setSheet('sub:' + s.id)}>
            <span className="a-glyph lg" style={{ background: s.color }}>{s.glyph}</span>
            <span className="a-row-main">
              <span>{s.name}</span>
              <small>{d.subs[s.id].active ? 'Списание ' + dateLong(s.next) : 'Приостановлена'}</small>
            </span>
            <span className="a-row-end">
              <b>{fmt(s.amt)} BYN</b>
              {d.subs[s.id].kopi && d.subs[s.id].active && roundUp(s.amt, d.step, d.mult) > 0 && (
                <small className="k">+{fmt(roundUp(s.amt, d.step, d.mult))} в KOPI</small>
              )}
            </span>
          </button>
        ))}
      </div>
      <button className="a-btn outline" onClick={() => setSheet('addsub')}>
        <Icon name="plus" size={18} /> Найти подписки в выписке
      </button>
    </div>
  );
}

/* ───────────────────────── KOPI ───────────────────────── */
function Kopi({ ctx }) {
  const { d, R, p, A, pp, commit, buyNow, reset, resetArmed, setSheet } = ctx;
  const circ = (items, cur, key, lab) =>
    items.map((v) => (
      <button key={v} className={'a-circle' + (v === cur ? ' on' : '')} onClick={() => commit((s) => ({ ...s, [key]: v }))}>
        {lab(v)}
        {v === cur && <span className="a-circle-ok"><Icon name="check" size={11} stroke={3.5} /></span>}
      </button>
    ));
  const holdRows = ASSET_KEYS.filter((a) => d.hold[a].cost > 0 || a === d.asset);
  return (
    <div className="a-screen">
      <header className="a-title-row">
        <h2>KOPI</h2>
        <span className="a-live"><i style={{ background: R.live ? GREEN : '#A0A8B4' }} />{R.src}</span>
      </header>

      <section className="a-kopi-hero">
        <span className="a-muted-inv">Портфель со сдачи</span>
        <b>{fmt(p.value)} BYN</b>
        <div className="a-kh-row">
          <span>Вложено {fmt(p.invested)} BYN</span>
          <span className="a-kh-pr">{p.invested ? pct(p.pr) : '—'}</span>
        </div>
        <div className="a-holds">
          {holdRows.map((a) => {
            const c = d.hold[a].cost;
            const v = p.val(a);
            const dd = c ? ((v - c) / c) * 100 : 0;
            return (
              <div key={a} className="a-hold">
                <span className="a-coin lg" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
                <span className="a-row-main">
                  <span>{ASSETS[a].name}</span>
                  <small>{a === 'SAFE' ? 'без изменения курса' : qty(d.hold[a].qty, a) + ' ' + a + ' · ' + Math.round(R[a]).toLocaleString('ru-RU') + ' BYN'}</small>
                </span>
                <span className="a-row-end">
                  <b>{fmt(v)} BYN</b>
                  <small style={{ color: c ? (dd >= 0 ? '#7CF29A' : '#FFB4AE') : undefined }}>{c ? pct(dd) : 'пока пусто'}</small>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="a-card a-piggy">
        <Ring pctValue={pp} size={68} label={Math.round(pp) + '%'} />
        <div>
          <b>{fmt(d.piggy)} BYN</b>
          <span className="a-muted">из {fmt(d.threshold)} BYN → покупка {A.code}</span>
        </div>
      </section>
      <div className="a-two">
        <button className="a-btn primary" onClick={buyNow} disabled={d.piggy <= 0}>
          {d.piggy > 0 ? 'Купить ' + A.code + ' на ' + fmt(d.piggy) : 'Копилка пуста'}
        </button>
        <button className="a-btn soft" onClick={() => setSheet('shop')}>Оплатить картой</button>
      </div>

      <h3 className="a-h3">Куда вкладывать</h3>
      <div className="a-card a-list">
        {ASSET_KEYS.map((a) => (
          <button key={a} className="a-row" onClick={() => commit((s) => ({ ...s, asset: a }))} aria-pressed={d.asset === a}>
            <span className="a-coin lg" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
            <span className="a-row-main">
              <span>{ASSETS[a].name}</span>
              <small>{ASSETS[a].desc}</small>
            </span>
            <span className={'a-radio' + (d.asset === a ? ' on' : '')}>{d.asset === a && <Icon name="check" size={13} stroke={3} />}</span>
          </button>
        ))}
      </div>

      <h3 className="a-h3">Округлять до</h3>
      <div className="a-circles">{circ([100, 500, 1000], d.step, 'step', (v) => fmtInt(v))}<span className="a-muted">BYN</span></div>

      <h3 className="a-h3">Множитель сдачи</h3>
      <div className="a-circles">{circ([1, 2, 5], d.mult, 'mult', (v) => '×' + v)}</div>

      <h3 className="a-h3">Покупать пакетом</h3>
      <div className="a-seg small">
        {[1000, 2000, 5000].map((v) => (
          <button key={v} className={d.threshold === v ? 'on' : ''} onClick={() => commit((s) => ({ ...s, threshold: v }))}>
            {fmtInt(v)} BYN
          </button>
        ))}
      </div>

      <h3 className="a-h3">Хранение</h3>
      <button className="a-card a-row solo" onClick={() => setSheet('wallet')}>
        <span className="a-glyph lg" style={{ background: '#2470FF' }}>W</span>
        <span className="a-row-main">
          <span>Кошелёк WhiteBird</span>
          <small>Покупку проводит резидент ПВТ. Вывод на Карту Crypto Mastercard</small>
        </span>
        <Icon name="right" size={18} className="a-chev" />
      </button>

      <h3 className="a-h3">Округления и покупки · {d.hist.filter((h) => h.type === 'round').length}</h3>
      <div className="a-card a-list">
        {d.hist.slice(0, 12).map((h) => <KopiHistRow key={h.id} h={h} />)}
      </div>
      <button className="a-reset" onClick={reset}>{resetArmed ? 'Нажмите ещё раз, чтобы сбросить' : 'Начать демо заново'}</button>
    </div>
  );
}

function KopiHistRow({ h }) {
  if (h.type === 'round') {
    return (
      <div className="a-row static">
        <span className="a-glyph k">↑</span>
        <span className="a-row-main">
          <span>{h.merchant}</span>
          <small>{fmt(h.a)} → {fmt(h.rounded)} BYN · {when(h.t)}</small>
        </span>
        <b className="a-k-val">+{fmt(h.roundup)}</b>
      </div>
    );
  }
  const a = ASSETS[h.asset];
  return (
    <div className="a-row static">
      <span className="a-coin lg" style={{ background: a.bg }}>{a.sym}</span>
      <span className="a-row-main">
        <span>Покупка {h.asset === 'SAFE' ? 'консервативного' : h.asset}</span>
        <small>{h.asset === 'SAFE' ? 'пакетом' : qty(h.qty, h.asset) + ' ' + h.asset} · {when(h.t)}</small>
      </span>
      <b>{fmt(h.amount)} BYN</b>
    </div>
  );
}

/* ───────────────────────── История ───────────────────────── */
function History({ ctx }) {
  const { d, histFilter, setHistFilter, setSheet } = ctx;
  const filters = [['all', 'Все'], ['pay', 'Покупки'], ['kopi', 'Со сдачей'], ['in', 'Зачисления'], ['out', 'Переводы']];
  const ops = d.ops.filter((o) =>
    histFilter === 'all' ? true
      : histFilter === 'pay' ? o.type === 'pay'
        : histFilter === 'kopi' ? o.round > 0
          : histFilter === 'in' ? o.amount > 0
            : o.type === 'transfer' || o.type === 'exchange');
  const spent = d.ops.filter((o) => o.amount < 0 && Date.now() - o.t < 30 * 864e5).reduce((t, o) => t - o.amount, 0);
  const kopi = d.ops.reduce((t, o) => t + (o.round || 0), 0);
  return (
    <div className="a-screen">
      <header className="a-title-row"><h2>История</h2></header>
      <section className="a-card a-hist-sum">
        <div><span className="a-muted">Расходы за 30 дней</span><b>{fmt(spent)} BYN</b></div>
        <div><span className="a-muted">Из них в KOPI</span><b className="k">{fmt(kopi)} BYN</b></div>
      </section>
      <div className="a-chips scroll">
        {filters.map(([k, l]) => (
          <button key={k} className={histFilter === k ? 'on' : ''} onClick={() => setHistFilter(k)}>{l}</button>
        ))}
      </div>
      <div className="a-card a-list">
        {ops.length === 0 && <div className="a-empty">Операций нет</div>}
        {ops.map((o) => {
          const t = TPL.find((x) => x.name === o.title) || SUBS.find((x) => x.name === o.title);
          return (
            <button key={o.id} className="a-row" onClick={() => setSheet('op:' + o.id)}>
              <span className="a-glyph lg" style={{ background: o.amount > 0 ? GREEN : t ? t.color : '#8A96A8' }}>
                {o.amount > 0 ? <Icon name="down" size={16} /> : t ? t.glyph : o.title[0]}
              </span>
              <span className="a-row-main">
                <span>{o.title}</span>
                <small>{opLabel(o)} · {when(o.t)}</small>
              </span>
              <span className="a-row-end">
                <b style={{ color: o.amount > 0 ? GREEN : undefined }}>{(o.amount > 0 ? '+' : '−') + fmt(Math.abs(o.amount))} {o.cur || 'BYN'}</b>
                {o.round > 0 && <small className="k">из них {fmt(o.round)} в KOPI</small>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const opLabel = (o) =>
  ({ topup: 'Зачисление', transfer: 'Перевод', exchange: 'Обмен валюты', pay: 'Карта Classic' })[o.type] || 'Операция';

/* ───────────────────────── Кабинет ───────────────────────── */
function Cabinet({ ctx }) {
  const { d, commit, setSheet, showToast, reset, resetArmed } = ctx;
  const set = (k, v) => commit((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  return (
    <div className="a-screen">
      <header className="a-title-row"><h2>Кабинет</h2></header>
      <section className="a-card a-profile">
        <span className="a-avatar lg">АК</span>
        <div>
          <b>Алексей К.</b>
          <span className="a-muted">+375 29 ••• 12 34</span>
        </div>
        <span className="a-pill red">Альфа-Клиент</span>
      </section>

      <div className="a-card a-list">
        <CabRow icon="grid" label="Мои продукты" sub={(2 + d.products.length) + ' продукта'} onClick={() => setSheet('products')} />
        <CabRow icon="doc" label="Реквизиты счёта" sub="BY20 ALFA 3014 ••••" onClick={() => setSheet('requisites')} />
        <CabRow icon="gift" label="Кэшбэк и бонусы" sub="KOPI + кэшбэк до 5%" onClick={() => setSheet('cashback')} />
      </div>

      <h3 className="a-h3">Настройки</h3>
      <div className="a-card a-list">
        <CabRow icon="bell" label="Push-уведомления" end={<Switch on={d.settings.push} onChange={(v) => set('push', v)} label="Push" />} />
        <CabRow icon="lock" label="Вход по Face ID" end={<Switch on={d.settings.faceId} onChange={(v) => set('faceId', v)} label="Face ID" />} />
        <CabRow kopi label="Уведомления KOPI о сдаче" end={<Switch on={d.settings.kopiPush} onChange={(v) => set('kopiPush', v)} label="KOPI" />} />
        <CabRow
          icon="globe"
          label="Язык"
          sub={d.settings.lang === 'ru' ? 'Русский' : 'Беларуская'}
          onClick={() => {
            const lang = d.settings.lang === 'ru' ? 'by' : 'ru';
            set('lang', lang);
            showToast('Язык интерфейса', lang === 'ru' ? 'Русский' : 'Беларуская (в концепте — только подпись)');
          }}
        />
      </div>

      <h3 className="a-h3">Помощь</h3>
      <div className="a-card a-list">
        <CabRow icon="chat" label="Чат с банком" sub="Ответим за 1 минуту" onClick={() => setSheet('support')} />
        <CabRow icon="phone" label="Позвонить" sub="198 · бесплатно по РБ" href="tel:198" />
        <CabRow icon="help" label="О концепте KOPI" onClick={() => setSheet('about')} />
      </div>
      <button className="a-reset" onClick={reset}>{resetArmed ? 'Нажмите ещё раз, чтобы сбросить' : 'Сбросить демо-данные'}</button>
    </div>
  );
}

function CabRow({ icon, kopi, label, sub, onClick, end, href }) {
  const inner = (
    <>
      <span className="a-cab-ic">{kopi ? <span className="a-k-mark solid sm">K</span> : <Icon name={icon} size={20} />}</span>
      <span className="a-row-main">
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </span>
      {end || <Icon name="right" size={18} className="a-chev" />}
    </>
  );
  if (href) return <a className="a-row" href={href}>{inner}</a>;
  if (end) return <div className="a-row static">{inner}</div>;
  return <button className="a-row" onClick={onClick}>{inner}</button>;
}

/* ───────────────────────── Оплачено успешно ───────────────────────── */
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
          <span className="a-k-mark solid sm">K</span>
          <span className="a-row-main"><span><b>Сдача в KOPI</b></span></span>
          <b className="a-k-val">{done?.kopi}</b>
        </div>
      </div>
      <p className="a-done-note">{done?.note}</p>
      <div style={{ flex: 1 }} />
      <button className="a-btn primary" onClick={onClose}>Готово</button>
    </div>
  );
}

/* ───────────────────────── Шторки ───────────────────────── */
function SheetHost({ ctx, sheet }) {
  const { setSheet } = ctx;
  const close = () => setSheet(null);
  const key = sheet ? sheet.split(':')[0] : null;
  const arg = sheet ? sheet.split(':')[1] : null;
  const titles = {
    shop: ['Оплата в магазине', 'Эмулятор кассы: так банк видит покупку'],
    topup: ['Пополнить счёт', 'С карты другого банка, без комиссии'],
    transfer: ['Перевод', 'По номеру телефона'],
    qr: ['QR-код для оплаты', 'Покажите на кассе'],
    product: ['Оформить продукт', 'Решение онлайн'],
    exchange: ['Обмен валюты', 'По курсу банка, круглосуточно'],
    map: ['Отделения и банкоматы', 'Минск'],
    search: ['Поиск', 'Действия и разделы'],
    notif: ['Уведомления', ''],
    sub: ['Подписка', ''],
    addsub: ['Поиск подписок', 'Анализ выписки за 3 месяца'],
    wallet: ['Кошелёк WhiteBird', 'Где хранятся монеты KOPI'],
    products: ['Мои продукты', ''],
    requisites: ['Реквизиты', 'Текущий счёт Classic'],
    cashback: ['Кэшбэк и бонусы', ''],
    support: ['Чат с банком', 'Онлайн'],
    about: ['О концепте KOPI', ''],
    op: ['Операция', ''],
  };
  const [title, subtitle] = titles[key] || ['', ''];
  const sub = key === 'sub' ? SUBS.find((s) => s.id === arg) : null;
  return (
    <Sheet open={!!sheet} onClose={close} title={sub ? sub.name : title} subtitle={sub ? sub.plan : subtitle}>
      {key === 'shop' && <ShopSheet ctx={ctx} />}
      {key === 'topup' && <TopupSheet ctx={ctx} />}
      {key === 'transfer' && <TransferSheet ctx={ctx} />}
      {key === 'qr' && <QrSheet ctx={ctx} />}
      {key === 'product' && <ProductSheet ctx={ctx} />}
      {key === 'exchange' && <ExchangeSheet ctx={ctx} />}
      {key === 'map' && <MapSheet />}
      {key === 'search' && <SearchSheet ctx={ctx} />}
      {key === 'notif' && <NotifSheet ctx={ctx} />}
      {key === 'sub' && sub && <SubSheet ctx={ctx} sub={sub} />}
      {key === 'addsub' && <AddSubSheet ctx={ctx} />}
      {key === 'wallet' && <WalletSheet ctx={ctx} />}
      {key === 'products' && <ProductsSheet ctx={ctx} />}
      {key === 'requisites' && <RequisitesSheet ctx={ctx} />}
      {key === 'cashback' && <CashbackSheet ctx={ctx} />}
      {key === 'support' && <SupportSheet />}
      {key === 'about' && <AboutSheet />}
      {key === 'op' && <OpSheet ctx={ctx} id={arg} />}
    </Sheet>
  );
}

function AmountInput({ value, onChange, cur = 'BYN', autoFocus }) {
  return (
    <label className="a-amount">
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" autoFocus={autoFocus} aria-label="Сумма" />
      <span>{cur}</span>
    </label>
  );
}

function ShopSheet({ ctx }) {
  const { d, payMany, showToast } = ctx;
  const [amount, setAmount] = useState('6,40');
  const k = parseAmount(amount);
  const up = k ? roundUp(k, d.step, d.mult) : 0;
  return (
    <>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-presets">
        {PRESETS.map(([n, a]) => (
          <button key={n} onClick={() => payMany([{ name: n, a }])}>{n} {fmt(a)}</button>
        ))}
      </div>
      <div className="a-sheet-info">
        <span>Карта Classic · {fmt(d.balance)} BYN</span>
        <span className="k">{k ? 'В KOPI +' + fmt(up) + ' BYN' : 'KOPI: до ' + fmtInt(d.step) + ' BYN' + (d.mult > 1 ? ' ×' + d.mult : '')}</span>
      </div>
      <button className="a-btn primary" onClick={() => (k ? payMany([{ name: 'Покупка', a: k }]) : showToast('Неверная сумма', 'Введите сумму, например 6,40'))}>
        Оплатить {k ? fmt(k) + ' BYN' : ''}
      </button>
    </>
  );
}

function TopupSheet({ ctx }) {
  const { commit, setSheet, showToast } = ctx;
  const [amount, setAmount] = useState('100');
  const [src, setSrc] = useState('visa');
  const k = parseAmount(amount, 500000);
  const submit = () => {
    if (!k) return showToast('Неверная сумма', 'От 0,01 до 5 000 BYN');
    const t = Date.now();
    commit((s) => ({ ...s, balance: s.balance + k, ops: [{ id: 'tp' + t, type: 'topup', title: 'Пополнение', amount: k, round: 0, t }, ...s.ops] }));
    setSheet(null);
    showToast('Счёт пополнен', '+' + fmt(k) + ' BYN');
  };
  return (
    <>
      <div className="a-opts">
        {[['visa', 'VISA •••• 4417', 'Другой банк'], ['mc', 'Mastercard •••• 0932', 'Другой банк'], ['erip', 'ЕРИП', 'Наличными или из другого банка']].map(([id, n, s]) => (
          <button key={id} className={'a-opt' + (src === id ? ' on' : '')} onClick={() => setSrc(id)}>
            <Icon name={id === 'erip' ? 'grid' : 'card'} size={20} />
            <span className="a-row-main"><span>{n}</span><small>{s}</small></span>
            <span className={'a-radio' + (src === id ? ' on' : '')}>{src === id && <Icon name="check" size={13} stroke={3} />}</span>
          </button>
        ))}
      </div>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-presets">
        {['50', '100', '200', '500'].map((v) => <button key={v} onClick={() => setAmount(v)}>{v} BYN</button>)}
      </div>
      <button className="a-btn primary" onClick={submit}>Пополнить</button>
    </>
  );
}

function TransferSheet({ ctx }) {
  const { d, commit, setSheet, showToast } = ctx;
  const [to, setTo] = useState(CONTACTS[0]);
  const [phone, setPhone] = useState(CONTACTS[0].phone);
  const [amount, setAmount] = useState('20');
  const k = parseAmount(amount);
  const submit = () => {
    if (!k) return showToast('Неверная сумма', 'Введите сумму перевода');
    if (!/^\+?[\d\s-]{9,}$/.test(phone)) return showToast('Проверьте номер', 'Формат +375 XX XXX-XX-XX');
    if (k > d.balance) return showToast('Недостаточно средств', 'На карте ' + fmt(d.balance) + ' BYN');
    const t = Date.now();
    const name = to && to.phone === phone ? to.name : phone;
    commit((s) => ({ ...s, balance: s.balance - k, ops: [{ id: 'tr' + t, type: 'transfer', title: 'Перевод · ' + name, amount: -k, round: 0, t }, ...s.ops] }));
    setSheet(null);
    showToast('Перевод отправлен', fmt(k) + ' BYN · ' + name);
  };
  return (
    <>
      <div className="a-contacts">
        {CONTACTS.map((c) => (
          <button key={c.name} className={to?.name === c.name ? 'on' : ''} onClick={() => { setTo(c); setPhone(c.phone); }}>
            <span style={{ background: c.color }}>{c.name[0]}</span>
            {c.name}
          </button>
        ))}
      </div>
      <label className="a-field">
        <small>Номер телефона</small>
        <input value={phone} onChange={(e) => { setPhone(e.target.value); setTo(null); }} inputMode="tel" />
      </label>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-sheet-info"><span>Без комиссии</span><span>Доступно {fmt(d.balance)} BYN</span></div>
      <button className="a-btn primary" onClick={submit}>Перевести</button>
    </>
  );
}

function QrSheet({ ctx }) {
  const { d } = ctx;
  // Детерминированный «QR» из номера счёта — визуальная заглушка для концепта.
  const cells = useMemo(() => {
    let x = 20230417;
    return Array.from({ length: 21 * 21 }, (_, i) => {
      const r = Math.floor(i / 21);
      const c = i % 21;
      const finder = (rr, cc) => rr < 7 && cc < 7 && (rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr > 1 && rr < 5 && cc > 1 && cc < 5));
      if (finder(r, c) || finder(r, 20 - c) || finder(20 - r, c)) return true;
      if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) return false;
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x % 2 === 0;
    });
  }, []);
  return (
    <>
      <div className="a-qr">
        {cells.map((on, i) => <i key={i} style={{ background: on ? '#0B1F35' : 'transparent' }} />)}
      </div>
      <div className="a-sheet-info"><span>Карта Classic</span><span>{fmt(d.balance)} BYN</span></div>
      <p className="a-small">Касса считает код, сумма спишется с карты, сдача уйдёт в KOPI автоматически.</p>
    </>
  );
}

function ProductSheet({ ctx }) {
  const { d, commit, setSheet, showToast } = ctx;
  return (
    <div className="a-card a-list flat">
      {PRODUCTS.map((p) => {
        const has = d.products.includes(p.id);
        return (
          <button
            key={p.id}
            className="a-row"
            onClick={() => {
              if (has) return showToast('Заявка уже отправлена', p.name);
              commit((s) => ({ ...s, products: [...s.products, p.id] }));
              setSheet(null);
              showToast('Заявка отправлена', p.name + ' · ответим в течение 2 минут');
            }}
          >
            <span className="a-glyph lg" style={{ background: p.color }}>{p.glyph}</span>
            <span className="a-row-main"><span>{p.name}</span><small>{has ? 'Заявка на рассмотрении' : p.desc}</small></span>
            {has ? <span className="a-pill">В работе</span> : <Icon name="right" size={18} className="a-chev" />}
          </button>
        );
      })}
    </div>
  );
}

function ExchangeSheet({ ctx }) {
  const { d, R, commit, setSheet, showToast } = ctx;
  const [dir, setDir] = useState('buy');
  const [amount, setAmount] = useState('100');
  const buyRate = R.usd * 1.012;
  const sellRate = R.usd * 0.988;
  const k = parseAmount(amount);
  const get = !k ? 0 : dir === 'buy' ? Math.floor(k / buyRate) : Math.floor(k * sellRate);
  const submit = () => {
    if (!k) return showToast('Неверная сумма', 'Введите сумму');
    if (dir === 'buy' && k > d.balance) return showToast('Недостаточно BYN', 'На карте ' + fmt(d.balance) + ' BYN');
    if (dir === 'sell' && k > d.usd) return showToast('Недостаточно USD', 'На счёте ' + fmt(d.usd) + ' $');
    const t = Date.now();
    commit((s) => ({
      ...s,
      balance: dir === 'buy' ? s.balance - k : s.balance + get,
      usd: dir === 'buy' ? s.usd + get : s.usd - k,
      ops: [{ id: 'ex' + t, type: 'exchange', title: dir === 'buy' ? 'Покупка USD' : 'Продажа USD', amount: dir === 'buy' ? -k : get, round: 0, t }, ...s.ops],
    }));
    setSheet(null);
    showToast('Обмен выполнен', dir === 'buy' ? '+' + fmt(get) + ' $ за ' + fmt(k) + ' BYN' : '+' + fmt(get) + ' BYN за ' + fmt(k) + ' $');
  };
  return (
    <>
      <div className="a-seg">
        <button className={dir === 'buy' ? 'on' : ''} onClick={() => setDir('buy')}>Купить USD</button>
        <button className={dir === 'sell' ? 'on' : ''} onClick={() => setDir('sell')}>Продать USD</button>
      </div>
      <div className="a-rates">
        <div><small>Покупка</small><b>{buyRate.toFixed(4)}</b></div>
        <div><small>Продажа</small><b>{sellRate.toFixed(4)}</b></div>
        <div><small>НБРБ</small><b>{R.usd.toFixed(4)}</b></div>
      </div>
      <AmountInput value={amount} onChange={setAmount} cur={dir === 'buy' ? 'BYN' : 'USD'} />
      <div className="a-sheet-info">
        <span>Получите</span>
        <b>{fmt(get)} {dir === 'buy' ? 'USD' : 'BYN'}</b>
      </div>
      <button className="a-btn primary" onClick={submit}>Обменять</button>
    </>
  );
}

function MapSheet() {
  const q = (b) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Альфа Банк ' + b.addr + ' Минск');
  return (
    <>
      <div className="a-map">
        {BRANCHES.map((b, i) => <span key={b.name} className="a-map-pin" style={{ left: 18 + i * 20 + '%', top: 30 + ((i * 37) % 45) + '%' }}>A</span>)}
        <span className="a-map-me" />
      </div>
      <div className="a-card a-list flat">
        {BRANCHES.map((b) => (
          <a key={b.name} className="a-row" href={q(b)} target="_blank" rel="noreferrer">
            <span className="a-glyph lg" style={{ background: RED }}><Icon name="pin" size={16} /></span>
            <span className="a-row-main"><span>{b.name}</span><small>{b.addr} · {b.hours}</small></span>
            <span className="a-row-end"><b>{b.dist}</b><small>маршрут</small></span>
          </a>
        ))}
      </div>
    </>
  );
}

function SearchSheet({ ctx }) {
  const { go, setSheet, buyNow } = ctx;
  const [q, setQ] = useState('');
  const items = [
    ['Оплата в магазине', 'bag', () => setSheet('shop')],
    ['Пополнить счёт', 'plus', () => setSheet('topup')],
    ['Перевод по телефону', 'send', () => setSheet('transfer')],
    ['Обмен валюты', 'swap', () => setSheet('exchange')],
    ['Подписки', 'repeat', () => go('pay', 'subs')],
    ['Шаблоны платежей', 'card', () => go('pay', 'tpl')],
    ['KOPI: настройки сдачи', 'trend', () => go('kopi')],
    ['Купить криптовалюту сейчас', 'trend', () => { setSheet(null); buyNow(); }],
    ['История операций', 'clock', () => go('hist')],
    ['Отделения и банкоматы', 'pin', () => setSheet('map')],
    ['Оформить продукт', 'grid', () => setSheet('product')],
    ['Чат с банком', 'chat', () => setSheet('support')],
  ];
  const f = items.filter(([n]) => n.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <label className="a-search">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Перевод, подписки, KOPI…" autoFocus />
      </label>
      <div className="a-card a-list flat">
        {f.length === 0 && <div className="a-empty">Ничего не найдено</div>}
        {f.map(([n, ic, fn]) => (
          <button key={n} className="a-row" onClick={fn}>
            <span className="a-cab-ic"><Icon name={ic} size={20} /></span>
            <span className="a-row-main"><span>{n}</span></span>
            <Icon name="right" size={18} className="a-chev" />
          </button>
        ))}
      </div>
    </>
  );
}

function NotifSheet({ ctx }) {
  const { d, commit, go } = ctx;
  const items = d.hist.slice(0, 8).map((h) => ({
    id: h.id,
    t: h.t,
    unread: h.t > d.readAt,
    title: h.type === 'round' ? 'Сдача +' + fmt(h.roundup) + ' BYN' : 'Куплено ' + (h.asset === 'SAFE' ? 'на ' + fmt(h.amount) + ' BYN' : qty(h.qty, h.asset) + ' ' + h.asset),
    text: h.type === 'round' ? h.merchant + ': ' + fmt(h.a) + ' → ' + fmt(h.rounded) + ' BYN' : 'Пакетная покупка KOPI',
  }));
  return (
    <>
      <div className="a-card a-list flat">
        <button className="a-row" onClick={() => go('pay', 'subs')}>
          <span className="a-glyph lg" style={{ background: RED }}><Icon name="repeat" size={16} /></span>
          <span className="a-row-main"><span>Подписки под контролем</span><small>Календарь списаний и сдача с каждой подписки</small></span>
        </button>
        {items.map((n) => (
          <button key={n.id} className="a-row" onClick={() => go('kopi')}>
            <span className="a-k-mark solid">K</span>
            <span className="a-row-main"><span>{n.title}</span><small>{n.text} · {when(n.t)}</small></span>
            {n.unread && <span className="a-unread" />}
          </button>
        ))}
      </div>
      <button className="a-btn soft" onClick={() => commit((s) => ({ ...s, readAt: Date.now() }))}>Отметить все прочитанными</button>
    </>
  );
}

function SubSheet({ ctx, sub }) {
  const { d, commit, payMany, showToast, setSheet } = ctx;
  const st = d.subs[sub.id];
  const up = roundUp(sub.amt, d.step, d.mult);
  const set = (patch) => commit((s) => ({ ...s, subs: { ...s.subs, [sub.id]: { ...s.subs[sub.id], ...patch } } }));
  const paid = d.ops.filter((o) => o.title === sub.name).slice(0, 3);
  return (
    <>
      <div className="a-sub-hero">
        <span className="a-glyph xl" style={{ background: sub.color }}>{sub.glyph}</span>
        <b>{fmt(sub.amt)} BYN</b>
        <span className="a-muted">{st.active ? 'Следующее списание ' + dateLong(nextCharge(sub.day)) : 'Подписка приостановлена'}</span>
      </div>
      <div className="a-card a-list flat">
        <div className="a-row static">
          <span className="a-k-mark solid">K</span>
          <span className="a-row-main"><span>Округлять в KOPI</span><small>{up ? '+' + fmt(up) + ' BYN с каждого списания' : 'Сумма круглая при текущем шаге'}</small></span>
          <Switch on={st.kopi} onChange={(v) => set({ kopi: v })} label="Округлять в KOPI" />
        </div>
        <div className="a-row static">
          <span className="a-cab-ic"><Icon name="calendar" size={20} /></span>
          <span className="a-row-main"><span>Каждый месяц, {sub.day} числа</span><small>Карта Classic</small></span>
        </div>
        {paid.map((o) => (
          <div key={o.id} className="a-row static">
            <span className="a-cab-ic"><Icon name="check" size={18} /></span>
            <span className="a-row-main"><span>Оплачено</span><small>{when(o.t)}</small></span>
            <b>{fmt(-o.amount)} BYN</b>
          </div>
        ))}
      </div>
      <button className="a-btn primary" disabled={!st.active} onClick={() => payMany([{ name: sub.name, a: sub.amt, kopi: st.kopi }])}>
        Оплатить сейчас
      </button>
      <button
        className="a-btn soft"
        onClick={() => {
          set({ active: !st.active });
          setSheet(null);
          showToast(st.active ? 'Подписка приостановлена' : 'Подписка возобновлена', sub.name);
        }}
      >
        <Icon name={st.active ? 'pause' : 'play'} size={18} /> {st.active ? 'Приостановить' : 'Возобновить'}
      </button>
    </>
  );
}

function AddSubSheet({ ctx }) {
  const { setSheet, showToast } = ctx;
  const [state, setState] = useState('idle');
  const run = () => {
    setState('loading');
    setTimeout(() => setState('done'), 1300);
  };
  return (
    <>
      <p className="a-small">KOPI найдёт регулярные списания по карте и предложит включить для них округление.</p>
      {state === 'done' ? (
        <div className="a-card a-list flat">
          <div className="a-row static">
            <span className="a-cab-ic"><Icon name="check" size={18} /></span>
            <span className="a-row-main"><span>Новых подписок не найдено</span><small>Все {SUBS.length} уже в списке</small></span>
          </div>
        </div>
      ) : null}
      <button
        className="a-btn primary"
        onClick={() => (state === 'done' ? (setSheet(null), showToast('Готово', 'Подписки актуальны')) : run())}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? <><span className="spinner" /> Анализируем выписку…</> : state === 'done' ? 'Готово' : 'Запустить поиск'}
      </button>
    </>
  );
}

function WalletSheet({ ctx }) {
  const { d, R, p, showToast } = ctx;
  return (
    <>
      <div className="a-card a-list flat">
        {ASSET_KEYS.filter((a) => d.hold[a].cost > 0).map((a) => (
          <div key={a} className="a-row static">
            <span className="a-coin lg" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
            <span className="a-row-main"><span>{ASSETS[a].name}</span><small>{a === 'SAFE' ? fmt(d.hold.SAFE.cost) + ' BYN' : qty(d.hold[a].qty, a) + ' ' + a}</small></span>
            <b>{fmt(p.val(a))} BYN</b>
          </div>
        ))}
      </div>
      <div className="a-sheet-info"><span>Курс</span><span>{R.src}</span></div>
      <button className="a-btn primary" onClick={() => showToast('Заявка на вывод создана', 'Средства поступят на Карту Crypto в течение часа')}>
        Вывести на Карту Crypto
      </button>
      <a className="a-btn soft" href="#/whitebird">Открыть концепт WhiteBird</a>
    </>
  );
}

function ProductsSheet({ ctx }) {
  const { d } = ctx;
  return (
    <div className="a-card a-list flat">
      <div className="a-row static">
        <span className="a-mini-card sm" />
        <span className="a-row-main"><span>Карта Classic •••• 7781</span><small>{fmt(d.balance)} BYN</small></span>
      </div>
      <div className="a-row static">
        <span className="a-glyph lg" style={{ background: '#21A038' }}>$</span>
        <span className="a-row-main"><span>Счёт в USD</span><small>{fmt(d.usd)} USD</small></span>
      </div>
      {d.products.map((id) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return (
          <div key={id} className="a-row static">
            <span className="a-glyph lg" style={{ background: p.color }}>{p.glyph}</span>
            <span className="a-row-main"><span>{p.name}</span><small>Заявка на рассмотрении</small></span>
          </div>
        );
      })}
    </div>
  );
}

function RequisitesSheet({ ctx }) {
  const { showToast } = ctx;
  const rows = [['Получатель', 'Алексей К.'], ['Счёт', 'BY20 ALFA 3014 7781 0000 0000 0000'], ['Банк', 'ЗАО «Альфа-Банк»'], ['БИК', 'ALFABY2X'], ['УНП банка', '101541947']];
  const copy = async () => {
    try { await navigator.clipboard.writeText(rows.map((r) => r.join(': ')).join('\n')); } catch (e) { /* без доступа к буферу */ }
    showToast('Реквизиты скопированы', 'Вставьте их в сообщение');
  };
  return (
    <>
      <div className="a-card a-list flat">
        {rows.map(([l, v]) => (
          <div key={l} className="a-row static"><span className="a-row-main"><small>{l}</small><span>{v}</span></span></div>
        ))}
      </div>
      <button className="a-btn primary" onClick={copy}><Icon name="copy" size={18} /> Скопировать</button>
    </>
  );
}

function CashbackSheet({ ctx }) {
  const { d } = ctx;
  const kopi = d.ops.reduce((t, o) => t + (o.round || 0), 0);
  return (
    <>
      <div className="a-rates">
        <div><small>Кэшбэк</small><b>12,40</b></div>
        <div><small>В KOPI</small><b>{fmt(kopi)}</b></div>
        <div><small>Категорий</small><b>3</b></div>
      </div>
      <div className="a-card a-list flat">
        {[['Кафе и рестораны', '5%', '#F5A623'], ['Такси', '3%', '#2D9CF0'], ['Онлайн-подписки', '2%', '#8A5CF6']].map(([n, v, c]) => (
          <div key={n} className="a-row static">
            <span className="a-glyph lg" style={{ background: c }}>%</span>
            <span className="a-row-main"><span>{n}</span><small>до конца месяца</small></span>
            <b>{v}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function SupportSheet() {
  const [msgs, setMsgs] = useState([{ me: false, text: 'Здравствуйте! Я помощник Альфа Банка. Чем помочь?' }]);
  const answers = {
    'Как работает KOPI?': 'Каждая оплата картой округляется вверх, разница копится и пакетом покупает выбранный актив через WhiteBird.',
    'Как вывести крипту?': 'Вкладка KOPI → Хранение → Вывести на Карту Crypto. Деньги придут в течение часа.',
    'Отключить подписку': 'Платежи → Подписки → выберите сервис → Приостановить.',
  };
  const ask = (q) => setMsgs((m) => [...m, { me: true, text: q }, { me: false, text: answers[q] }]);
  return (
    <>
      <div className="a-chat">
        {msgs.map((m, i) => <div key={i} className={'a-msg' + (m.me ? ' me' : '')}>{m.text}</div>)}
      </div>
      <div className="a-presets">
        {Object.keys(answers).map((q) => <button key={q} onClick={() => ask(q)}>{q}</button>)}
      </div>
    </>
  );
}

function AboutSheet() {
  return (
    <div className="a-about">
      <p><b>KOPI</b> округляет каждую оплату картой вверх до 1, 5 или 10 BYN. Разница копится в копилке.</p>
      <p>Когда копилка достигает порога, KOPI одним пакетом покупает BTC, ETH или консервативный BYN-инструмент. Покупку проводит WhiteBird, резидент ПВТ.</p>
      <p>Это интерактивный концепт: оплаты эмулируются, курсы — живые (НБРБ, Dzengi, CoinGecko).</p>
    </div>
  );
}

function OpSheet({ ctx, id }) {
  const { d } = ctx;
  const o = d.ops.find((x) => x.id === id);
  if (!o) return null;
  return (
    <>
      <div className="a-sub-hero">
        <b>{(o.amount > 0 ? '+' : '−') + fmt(Math.abs(o.amount))} BYN</b>
        <span className="a-muted">{o.title} · {when(o.t, true)}</span>
      </div>
      <div className="a-card a-list flat">
        <div className="a-row static"><span className="a-row-main"><small>Тип</small><span>{opLabel(o)}</span></span></div>
        {o.round > 0 && (
          <>
            <div className="a-row static"><span className="a-row-main"><small>Покупка</small><span>{fmt(-o.amount - o.round)} BYN</span></span></div>
            <div className="a-row static"><span className="a-row-main"><small>Сдача в KOPI</small><span className="k">+{fmt(o.round)} BYN</span></span></div>
          </>
        )}
        <div className="a-row static"><span className="a-row-main"><small>Статус</small><span>Исполнено</span></span></div>
      </div>
    </>
  );
}
