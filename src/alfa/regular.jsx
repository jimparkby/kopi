import { useMemo, useState } from 'react';
import { fmt, parseAmount, roundUp } from '../shared/format.js';
import { Icon } from '../shared/icons.jsx';
import { Switch } from '../shared/ui.jsx';
import { REG_TYPES, AUTO_CATS, CAT_COLORS, occursOn, nextDate, monthlyCost } from './model.js';
import { RegIcon, BackHead } from './screens.jsx';

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const ddmm = (d) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
export const per = (r) => (r.type === 'bill' ? '' : r.period === 'week' ? ' / нед.' : ' / месяц');

/* ───────────── Мои подписки ───────────── */
export function Subscriptions({ ctx }) {
  const { d, commit, pop, setSheet } = ctx;
  const [type, setType] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selDay, setSelDay] = useState(null);
  const [disabledView, setDisabledView] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const monthName = view.toLocaleDateString('ru-RU', { month: 'long', year: offset ? 'numeric' : undefined });
  const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const lead = (view.getDay() + 6) % 7;
  const active = d.regs.filter((r) => r.active && !r.hidden && (type === 'all' || r.type === type));

  const cells = useMemo(() => Array.from({ length: lead + daysIn }, (_, i) => {
    if (i < lead) return null;
    const date = new Date(view.getFullYear(), view.getMonth(), i - lead + 1);
    return { date, regs: active.filter((r) => occursOn(r, date)) };
  }), [d.regs, type, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = disabledView
    ? d.regs.filter((r) => !r.active || r.hidden)
    : active
      .filter((r) => !selDay || occursOn(r, selDay))
      .map((r) => ({ ...r, next: nextDate(r) }))
      .sort((a, b) => (a.next || 0) - (b.next || 0));

  // Подсказки: траты на кино, дубликаты, сдача в KOPI.
  const live = d.regs.filter((r) => r.active && !r.hidden);
  const kino = live.filter((r) => r.cat === 'Кино');
  const dupName = Object.entries(live.reduce((m, r) => ({ ...m, [r.name]: (m[r.name] || 0) + 1 }), {})).find(([, n]) => n > 1)?.[0];
  const kopiMonth = live.filter((r) => r.kopi).reduce((t, r) => t + roundUp(r.amt, d.step, d.mult), 0);
  const hints = [
    kino.length > 0 && { key: 'kino', title: fmt(kino.reduce((t, r) => t + monthlyCost(r), 0)) + ' BYN', text: 'Вы тратите на кино ежемесячно', icons: kino, onClick: () => setType('sub') },
    dupName && { key: 'dup', title: 'Повтор', text: 'Похоже, у вас 2 подписки на один сервис', icons: live.filter((r) => r.name === dupName), onClick: () => setSheet('reg:' + live.filter((r) => r.name === dupName)[1].id) },
    kopiMonth > 0 && { key: 'kopi', title: '+' + fmt(kopiMonth) + ' BYN', text: 'Сдача с регулярных платежей уходит в KOPI', kopi: true, onClick: () => ctx.push({ id: 'kopi' }) },
  ].filter((h) => h && !d.hints[h.key]);

  return (
    <>
      <BackHead title="" onBack={pop} right={<button className="a-icon-plain" onClick={() => setSheet('addmenu')} aria-label="Добавить"><Icon name="plus" size={24} /></button>} />
      <div className="a-layer-body">
        <div className="a-screen">
          <h1 className="a-h1">{disabledView ? 'Отключённые' : 'Мои подписки'}</h1>

          {!disabledView && hints.length > 0 && (
            <div className="a-hints">
              {hints.map((h) => (
                <div key={h.key} className="a-hint" role="button" tabIndex={0} onClick={h.onClick}>
                  <button className="a-hint-x" onClick={(e) => { e.stopPropagation(); commit((s) => ({ ...s, hints: { ...s.hints, [h.key]: true } })); }} aria-label="Скрыть подсказку"><Icon name="close" size={12} stroke={3} /></button>
                  <b>{h.title}</b>
                  <span>{h.text}</span>
                  <span className="a-mini-stack">
                    {h.kopi ? <span className="a-k-mark">K</span> : h.icons.slice(0, 3).map((r) => <RegIcon key={r.id} r={r} size={22} />)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!disabledView && (
            <>
              <div className="a-chips">
                {[['all', 'Все'], ['sub', 'Подписки'], ['auto', 'Автоплатежи'], ['bill', 'Счета']].map(([k, l]) => (
                  <button key={k} className={type === k ? 'on' : ''} onClick={() => { setType(k); setSelDay(null); }}>
                    {k !== 'all' && <i style={{ background: REG_TYPES[k].color }} />}{l}
                  </button>
                ))}
              </div>

              <section className="a-card a-cal">
                <div className="a-cal-head">
                  <b>{monthName[0].toUpperCase() + monthName.slice(1)}</b>
                  <span>
                    <button onClick={() => { setOffset(offset - 1); setSelDay(null); }} aria-label="Предыдущий месяц"><Icon name="left" size={16} /></button>
                    <button onClick={() => { setOffset(offset + 1); setSelDay(null); }} aria-label="Следующий месяц"><Icon name="right" size={16} /></button>
                  </span>
                </div>
                <div className="a-cal-grid">
                  {WEEK.map((w) => <small key={w}>{w}</small>)}
                  {cells.map((c, i) => {
                    if (!c) return <span key={i} />;
                    const isToday = c.date.getTime() === today.getTime();
                    const past = c.date < today;
                    const sel = selDay && c.date.getTime() === selDay.getTime();
                    return (
                      <button
                        key={i}
                        className={'a-cal-d' + (isToday ? ' today' : '') + (past ? ' past' : '') + (sel ? ' sel' : '')}
                        onClick={() => setSelDay(sel ? null : c.date)}
                      >
                        {c.date.getDate()}
                        <span className="a-cal-dots">{c.regs.slice(0, 3).map((r) => <i key={r.id} style={{ background: REG_TYPES[r.type].color }} />)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <div className="a-list-head">
            <b>{disabledView ? 'Отключённые платежи' : selDay ? 'Платежи ' + selDay.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Все платежи'}</b>
            {!disabledView && <button className="a-icon-plain" onClick={() => setSheet('addmenu')} aria-label="Добавить платёж"><Icon name="plus" size={22} /></button>}
          </div>
          <div className="a-reg-list">
            {list.length === 0 && <div className="a-empty">{disabledView ? 'Отключённых платежей нет' : 'В этот день списаний нет'}</div>}
            {list.map((r) => (
              <button key={r.id} className="a-reg-row" onClick={() => setSheet('reg:' + r.id)}>
                <RegIcon r={r} />
                <span className="a-row-main">
                  <span>{r.name}</span>
                  <small style={{ color: disabledView ? undefined : REG_TYPES[r.type].color }}>
                    {disabledView ? (r.hidden ? 'Убран из списка' : 'Отписка оформлена') : REG_TYPES[r.type].label}
                  </small>
                </span>
                <span className="a-row-end">
                  <b>{fmt(r.amt)} BYN{per(r)}</b>
                  {!disabledView && r.next && <small>{ddmm(r.next)}</small>}
                  {!disabledView && r.kopi && roundUp(r.amt, d.step, d.mult) > 0 && <small className="k">+{fmt(roundUp(r.amt, d.step, d.mult))} в KOPI</small>}
                </span>
              </button>
            ))}
          </div>

          {!disabledView && <button className="a-btn red" onClick={() => setSheet('addmenu')}>Добавить</button>}
          <button className="a-btn gray" onClick={() => { setDisabledView(!disabledView); setSelDay(null); }}>
            {disabledView ? 'Вернуться к активным' : 'Перейти к отключённым'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────── Добавление автоплатежа ───────────── */
export function AddAuto({ ctx }) {
  const { pop, push } = ctx;
  return (
    <>
      <BackHead title="Добавление автоплатежа" onBack={pop} />
      <div className="a-layer-body">
        <div className="a-screen">
          <div className="a-plain-list">
            {AUTO_CATS.map(([icon, label, cat]) => (
              <button key={label} className="a-pay-row" onClick={() => push({ id: 'regForm', type: 'auto', name: label === 'Автоперевод' ? '' : label, cat })}>
                <Icon name={icon} size={22} />
                <span className="a-row-main"><span>{label}</span></span>
                <Icon name="right" size={18} className="a-chev" />
              </button>
            ))}
          </div>
          <button className="a-btn red between" onClick={() => push({ id: 'addHist', type: 'auto' })}>
            <span><Icon name="clock" size={18} /> Добавить из истории</span>
            <Icon name="right" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────── Выбор операции из истории ───────────── */
export function AddFromHistory({ ctx, screen }) {
  const { d, pop, push } = ctx;
  const [q, setQ] = useState('');
  const ops = d.ops
    .filter((o) => o.amount < 0)
    .filter((o) => !q.trim() || o.title.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = [];
  ops.forEach((o) => {
    const key = new Date(o.t).toDateString();
    const g = groups[groups.length - 1];
    if (g && g.key === key) g.items.push(o);
    else groups.push({ key, label: new Date(o.t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), items: [o] });
  });
  return (
    <>
      <BackHead title={screen.type === 'auto' ? 'Автоплатёж из истории' : 'Добавление подписки'} onBack={pop} />
      <div className="a-layer-body">
        <div className="a-screen">
          <label className="a-search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" />
            <Icon name="search" size={18} />
          </label>
          {groups.map((g) => (
            <div key={g.key} className="a-hgroup">
              <div className="a-hgroup-head"><span>{g.label}</span></div>
              {g.items.map((o) => (
                <button key={o.id} className="a-hrow" onClick={() => push({ id: 'regForm', type: screen.type, name: o.title, amt: -o.amount - (o.round || 0), cat: o.cat })}>
                  <span className="a-reg-ic" style={{ background: CAT_COLORS[o.cat] || '#8A96A8' }}>{o.title[0]}</span>
                  <span className="a-row-main"><span>{o.title}</span><small>{o.cat || 'Прочее'}</small></span>
                  <b>−{fmt(-o.amount - (o.round || 0))}</b>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && <div className="a-empty">Ничего не найдено</div>}
        </div>
      </div>
    </>
  );
}

/* ───────────── Форма регулярного платежа ───────────── */
export function RegForm({ ctx, screen }) {
  const { d, commit, toSubs, showToast } = ctx;
  const [name, setName] = useState(screen.name || '');
  const [amount, setAmount] = useState(screen.amt ? fmt(screen.amt) : '');
  const [period, setPeriod] = useState('month');
  const [day, setDay] = useState(String(new Date().getDate() > 28 ? 28 : new Date().getDate()));
  const [kopi, setKopi] = useState(true);
  const k = parseAmount(amount);
  const cat = screen.cat || 'Прочее';
  const save = () => {
    if (!name.trim()) return showToast('Укажите название', 'Например, «Спортзал»');
    if (!k) return showToast('Укажите сумму', 'Например, 25,00');
    const dn = Math.min(28, Math.max(1, parseInt(day, 10) || 1));
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const r = {
      id: 'u' + Date.now(), type: screen.type, name: name.trim(), amt: k, period, day: dn, anchor: t.getTime(),
      color: CAT_COLORS[cat] || '#8A96A8', glyph: name.trim()[0].toUpperCase(), cat, active: true, hidden: false, kopi, card: 'Classic ··7781',
    };
    commit((s) => ({ ...s, regs: [...s.regs, r] }));
    toSubs();
    showToast(screen.type === 'auto' ? 'Автоплатёж добавлен' : 'Подписка добавлена', r.name + ' · ' + fmt(k) + ' BYN' + per(r));
  };
  return (
    <>
      <BackHead title={screen.type === 'auto' ? 'Добавление автоплатежа' : 'Добавление подписки'} onBack={ctx.pop} />
      <div className="a-layer-body">
        <div className="a-screen">
          <div className="a-form-head">
            <span className="a-reg-ic" style={{ background: CAT_COLORS[cat] || '#8A96A8' }}>{(name.trim()[0] || '+').toUpperCase()}</span>
            <span className="a-row-main"><b>{name || 'Новый платёж'}</b><small>{cat}</small></span>
          </div>
          <label className="a-field"><small>Сумма</small><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00 BYN" /></label>
          <div className="a-field row">
            <span><small>Карта списания</small><b>Альфа-Карта <i>··7781</i></b></span>
            <span className="a-cardthumb" />
          </div>
          <label className="a-field"><small>Название {screen.type === 'auto' ? 'платежа' : 'подписки'}</small><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" /></label>
          <span className="a-caps">Периодичность</span>
          <div className="a-seg">
            <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Ежемесячно</button>
            <button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>Еженедельно</button>
          </div>
          {period === 'month' && (
            <label className="a-field"><small>День списания (1–28)</small><input value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" /></label>
          )}
          <div className="a-field row">
            <span><small>KOPI</small><b>Округлять в KOPI{k ? ' · +' + fmt(roundUp(k, d.step, d.mult)) + ' BYN' : ''}</b></span>
            <Switch on={kopi} onChange={setKopi} label="Округлять в KOPI" />
          </div>
          <button className="a-btn red" onClick={save}>Сохранить</button>
        </div>
      </div>
    </>
  );
}
