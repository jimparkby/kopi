import { useEffect, useRef, useState } from 'react';
import { fmt, fmtInt, pct, qty, when } from '../shared/format.js';
import { Icon, Solid } from '../shared/icons.jsx';
import { Switch } from '../shared/ui.jsx';
import { ASSETS, ASSET_KEYS, FAVS, CAT_COLORS, REG_TYPES, PRODUCTS, nextDate, daysUntil } from './model.js';

const GREEN = '#21A038';
const RED = '#EF3124';

export function Ring({ value, size = 44, label, color = 'var(--kopi)' }) {
  return (
    <span className="a-ring" style={{ width: size, height: size, background: `conic-gradient(${color} ${value}%, var(--line-strong) 0)` }}>
      <span style={{ width: size - 8, height: size - 8 }}>{label}</span>
    </span>
  );
}

export function RegIcon({ r, size = 40 }) {
  return (
    <span className="a-reg-ic" style={{ width: size, height: size, background: r.color, fontSize: size * 0.42 }}>
      {r.glyph === 'A' ? <span className="a-a-mark"><b>A</b><i /></span> : r.glyph}
    </span>
  );
}

/** Логотип Альфы: красная «А» с чертой. */
export function Logo({ size = 30 }) {
  return (
    <span className="a-logo" style={{ fontSize: size }}>
      <b>A</b><i />
    </span>
  );
}

/** Шапка как в приложении: голубая полоса, логотип, бонусы, профиль, выход. */
export function Header({ ctx, title, band = true, right, children }) {
  const { push, setSheet, setLocked } = ctx;
  return (
    <header className={'a-head' + (band ? ' band' : '')}>
      <div className="a-head-top">
        <Logo />
        <span className="a-head-icons">
          <button className="a-bonus" onClick={() => setSheet('cashback')} aria-label="Альфа-бонусы">
            <span className="a-bonus-star">A</span>0
          </button>
          <button className="a-icon-plain" onClick={() => push({ id: 'profile' })} aria-label="Профиль"><Solid name="user" size={25} /></button>
          <button className="a-icon-plain" onClick={() => setLocked(true)} aria-label="Выйти"><Solid name="exit" size={24} /></button>
        </span>
      </div>
      <div className="a-head-title">
        <h1>{title}</h1>
        {right}
      </div>
      {children}
    </header>
  );
}

export function BackHead({ title, onBack, right }) {
  return (
    <div className="a-back-head">
      <button className="a-icon-plain" onClick={onBack} aria-label="Назад"><Icon name="left" size={24} /></button>
      <b>{title}</b>
      <span className="a-back-right">{right}</span>
    </div>
  );
}

function Byn() {
  return <span className="a-byn">Б</span>;
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="a-sec">
      <button className="a-sec-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        {title}
        <Icon name="chevDown" size={20} stroke={2.6} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && <div className="a-sec-body">{children}</div>}
    </section>
  );
}

function ProdRow({ icon, top, main, sub, subColor, onClick }) {
  return (
    <button className="a-prod" onClick={onClick}>
      {icon}
      <span className="a-prod-text">
        {top && <span className="a-prod-top">{top}</span>}
        <b>{main}</b>
        {sub && <span className="a-prod-sub" style={{ color: subColor }}>{sub}</span>}
      </span>
    </button>
  );
}

/* ───────────── Главная = Мои продукты ───────────── */
export function Home({ ctx }) {
  const { d, R, p, push, setSheet } = ctx;
  const total = d.balance + Math.round(d.usd * R.usd) + p.value + d.piggy;
  const upcoming = d.regs
    .filter((r) => r.active && !r.hidden)
    .map((r) => ({ ...r, next: nextDate(r) }))
    .filter((r) => r.next)
    .sort((a, b) => a.next - b.next);
  const A = ASSETS[d.asset];
  const pp = Math.min(100, (d.piggy / d.threshold) * 100);

  return (
    <div className="a-page">
      <Header ctx={ctx} title="Мои продукты" right={<button className="a-icon-plain muted" onClick={() => push({ id: 'profile' })} aria-label="Настройки"><Icon name="gear" size={24} /></button>} />
      <div className="a-content">
        <Section title="Общий баланс">
          <ProdRow
            icon={<span className="a-sq orange"><Icon name="wallet" size={22} /></span>}
            top="По курсу Альфа Банка"
            main={<>{fmt(total)} <Byn /></>}
            onClick={() => setSheet('stats')}
          />
        </Section>

        <Section title="KOPI · крипто со сдачи">
          <ProdRow
            icon={<span className="a-sq kopi">K</span>}
            top={'Портфель со сдачи · ' + (p.invested ? pct(p.pr) : '—')}
            main={<>{fmt(p.value)} <Byn /></>}
            sub={'Копилка ' + fmt(d.piggy) + ' из ' + fmtInt(d.threshold) + ' → ' + A.code}
            subColor="var(--kopi)"
            onClick={() => push({ id: 'kopi' })}
          />
          <div className="a-kopi-strip">
            <Ring value={pp} size={40} label={Math.round(pp) + '%'} />
            <span>До покупки {A.code} осталось <b>{fmt(Math.max(0, d.threshold - d.piggy))} BYN</b></span>
            <button onClick={() => setSheet('shop')}>Оплатить</button>
          </div>
        </Section>

        <Section title="Регулярные платежи">
          <ProdRow
            icon={<span className="a-sq red"><Icon name="repeat" size={22} /></span>}
            top={upcoming.length + ' активных · подписки и автоплатежи'}
            main="Мои подписки"
            sub={upcoming[0] ? 'Ближайшее: ' + upcoming[0].name + ', ' + (daysUntil(upcoming[0].next) === 0 ? 'сегодня' : 'через ' + daysUntil(upcoming[0].next) + ' дн.') : ''}
            subColor="var(--muted)"
            onClick={() => push({ id: 'subs' })}
          />
          <div className="a-upcoming">
            {upcoming.slice(0, 6).map((r) => {
              const left = daysUntil(r.next);
              const span = r.type === 'bill' ? 14 : r.period === 'week' ? 7 : 30;
              return (
                <button key={r.id} className="a-up-card" onClick={() => setSheet('reg:' + r.id)}>
                  <span className="a-up-top">
                    <RegIcon r={r} size={30} />
                    <span className="a-up-amt"><b>{fmt(r.amt)}</b><small style={{ color: REG_TYPES[r.type].color }}>{REG_TYPES[r.type].label}</small></span>
                  </span>
                  <b className="a-up-name">{r.name}</b>
                  <span className="a-up-days">
                    <Ring value={Math.max(4, 100 - (left / span) * 100)} size={24} label={left} color={left <= 2 ? RED : '#0B1F35'} />
                    <small>{left === 0 ? 'Сегодня' : left === 1 ? 'Завтра' : 'Дней до списания'}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Пакет решений">
          <ProdRow icon={<span className="a-sq gold"><Icon name="card" size={22} /></span>} main="Smart Gold" sub="В процессе" subColor="var(--purple)" onClick={() => setSheet('package')} />
        </Section>

        <Section title="Карты и счета">
          <ProdRow icon={<span className="a-cardart pink" />} top="9.7781 | Текущий счет" main={<>{fmt(d.balance)} <Byn /></>} onClick={() => setSheet('account:byn')} />
          <ProdRow icon={<span className="a-sq orange">$</span>} top="Текущий счет" main={fmt(d.usd) + ' $'} onClick={() => setSheet('account:usd')} />
          <ProdRow icon={<span className="a-cardart gold">VISA</span>} top="4.2702 | Текущий счет" main="0 €" onClick={() => setSheet('account:eur')} />
        </Section>

        <Section title="Карты других банков">
          <ProdRow icon={<span className="a-cardart blue" />} top="VISA ··4417" main="Привязана для пополнения" onClick={() => setSheet('account:other')} />
        </Section>
      </div>
    </div>
  );
}

/* ───────────── Платежи ───────────── */
export function Payments({ ctx }) {
  const { d, push, setSheet } = ctx;
  const favs = [...FAVS, ...(d.myFavs || [])];
  const pp = Math.min(100, (d.piggy / d.threshold) * 100);
  const subs = d.regs.filter((r) => r.active && !r.hidden);
  return (
    <div className="a-page">
      <Header ctx={ctx} title="Платежи">
        <div className="a-tpl-head">
          <h2>Шаблоны</h2>
          <span>
            <button className="a-icon-plain" onClick={() => setSheet('newfav')} aria-label="Новый шаблон"><Icon name="gear" size={24} /></button>
            <button className="a-pill-btn" onClick={() => setSheet('alltpl')}>Все</button>
          </span>
        </div>
      </Header>
      <div className="a-tpls">
        <button className="a-tpl" onClick={() => setSheet('utilities')}>
          <span className="a-sq red"><Icon name="card" size={22} /></span>
          Оплата одной кнопкой
        </button>
        {favs.map((f) => (
          <button key={f.id} className="a-tpl" onClick={() => setSheet('fav:' + f.id)}>
            <span className="a-sq" style={{ background: f.color, color: '#fff' }}>{f.glyph}</span>
            {f.name}
          </button>
        ))}
        <button className="a-tpl dashed" onClick={() => setSheet('newfav')}>
          <span className="a-sq light"><Icon name="plus" size={22} /></span>
          Новый шаблон
        </button>
      </div>

      <div className="a-content">
        <div className="a-promo krok">
          <span className="a-promo-text">
            <b>Оплата через КРОК</b>
            <span>QR-оплата</span>
          </span>
          <span className="a-promo-btns">
            <button onClick={() => setSheet('qr')} aria-label="Показать QR"><Icon name="qr" size={22} /></button>
            <button onClick={() => setSheet('scan')} aria-label="Сканировать QR"><Icon name="scan" size={22} /></button>
          </span>
          <span className="a-phone-art"><span>K</span></span>
        </div>

        <button className="a-promo kopi" onClick={() => push({ id: 'kopi' })}>
          <span className="a-promo-text">
            <b>Сдача в крипто · KOPI</b>
            <span>Копилка {fmt(d.piggy)} из {fmtInt(d.threshold)} BYN</span>
          </span>
          <Ring value={pp} size={52} label={Math.round(pp) + '%'} />
        </button>

        <h2 className="a-h2">Регулярные</h2>
        <ListRow icon="repeat" title="Мои подписки и автоплатежи" sub={subs.length + ' активных · календарь списаний'} onClick={() => push({ id: 'subs' })} />

        <h2 className="a-h2">Переводы</h2>
        <ListRow icon="swap" title="Обмен валют" sub="По нашему или вашему курсу" onClick={() => setSheet('exchange')} />
        <ListRow icon="repeat" title="Между своими счетами" sub="Пополнение счетов в любой валюте" onClick={() => setSheet('exchange')} />
        <ListRow icon="phone" title="Клиентам Альфа Банка" sub="По номеру телефона" onClick={() => setSheet('transfer')} />
        <ListRow icon="card" title="С карты на карту" sub="На карту любого банка" onClick={() => setSheet('card2card')} />
        <ListRow icon="doc" title="По реквизитам" sub="На счёт в любом банке" onClick={() => setSheet('byreq')} />

        <h2 className="a-h2">Платежи</h2>
        <ListRow icon="bag" title="Оплата в магазине" sub="Эмулятор кассы · сдача в KOPI" onClick={() => setSheet('shop')} />
        <ListRow icon="phone" title="Мобильная связь" onClick={() => setSheet('fav:mob')} />
        <ListRow icon="globe" title="Интернет и ТВ" onClick={() => setSheet('fav:net')} />
        <ListRow icon="home" title="Коммунальные платежи" sub="Свет, газ, вода" onClick={() => setSheet('utilities')} />
        <ListRow icon="doc" title="Налоги и штрафы" onClick={() => setSheet('taxes')} />
      </div>
    </div>
  );
}

function ListRow({ icon, title, sub, onClick, end }) {
  return (
    <button className="a-lrow" onClick={onClick}>
      <span className="a-sq light"><Icon name={icon} size={22} stroke={2.2} /></span>
      <span className="a-row-main"><span>{title}</span>{sub && <small>{sub}</small>}</span>
      {end}
    </button>
  );
}

/* ───────────── История ───────────── */
const H_FILTERS = [['reg', 'Регулярные'], ['in', 'Пополнения'], ['out', 'Списания'], ['kopi', 'Со сдачей']];

export function History({ ctx }) {
  const { d, setSheet } = ctx;
  const [f, setF] = useState(null);
  const [q, setQ] = useState('');
  const isReg = (o) => d.regs.some((r) => (r.id === o.regId || r.name === o.title) && !r.hidden);
  const list = d.ops
    .filter((o) => !f || (f === 'reg' ? isReg(o) : f === 'in' ? o.amount > 0 : f === 'out' ? o.amount < 0 : o.round > 0))
    .filter((o) => !q.trim() || o.title.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = [];
  list.forEach((o) => {
    const dt = new Date(o.t);
    const key = dt.toDateString();
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const n = new Date();
      const y = new Date(n);
      y.setDate(n.getDate() - 1);
      const dm = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      g = { key, label: key === n.toDateString() ? 'Сегодня, ' + dm : key === y.toDateString() ? 'Вчера, ' + dm : dm, items: [], sum: 0 };
      groups.push(g);
    }
    g.items.push(o);
    g.sum += o.amount;
  });

  return (
    <div className="a-page">
      <Header ctx={ctx} title="История" right={<button className="a-icon-plain muted" onClick={() => setSheet('stats')} aria-label="Расходы и доходы"><Icon name="chart" size={24} /></button>}>
        <label className="a-search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по операциям" />
        </label>
      </Header>
      <div className="a-content">
        <div className="a-chips">
          {H_FILTERS.map(([k, l]) => (
            <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(f === k ? null : k)}>{l}</button>
          ))}
        </div>
        {groups.length === 0 && <Empty icon="clock" title="Операций нет" text="Попробуйте изменить фильтр или запрос." />}
        {groups.map((g) => (
          <div key={g.key} className="a-hgroup">
            <div className="a-hgroup-head"><span>{g.label}</span><span>{(g.sum > 0 ? '+' : '−') + fmt(Math.abs(g.sum))} BYN</span></div>
            {g.items.map((o) => (
              <button key={o.id} className="a-hrow" onClick={() => setSheet('op:' + o.id)}>
                <span className="a-reg-ic" style={{ background: o.amount > 0 ? '#8A96A8' : CAT_COLORS[o.cat] || '#8A96A8' }}>
                  {o.amount > 0 ? <Icon name="down" size={18} /> : o.title[0]}
                </span>
                <span className="a-row-main"><span>{o.title}</span><small>{o.cat || (o.amount > 0 ? 'Пополнение' : 'Прочее')}</small></span>
                <span className="a-row-end">
                  <b className={o.amount > 0 ? 'pos' : ''}>
                    {(o.amount > 0 ? '+' : '−') + fmt(Math.abs(o.amount))}
                    {isReg(o) && <Icon name="clock" size={13} className="a-reg-mark" />}
                  </b>
                  {o.round > 0 && <small className="k">+{fmt(o.round)} в KOPI</small>}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ icon, title, text }) {
  return (
    <div className="a-empty-state">
      <span className="a-sq light"><Icon name={icon} size={22} /></span>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

/* ───────────── Диалоги ───────────── */
const NEWS = [
  { t: 'KOPI: крипто со сдачи', s: 'Округляйте покупки и копите в BTC, ETH или консервативном инструменте.', kopi: true },
  { t: 'Мои подписки', s: 'Подписки, автоплатежи и счета — в одном месте с календарём списаний.' },
  { t: 'Карта Crypto Mastercard', s: 'Выводите криптовалюту из WhiteBird и платите в любом магазине.' },
];

export function Dialogs({ ctx }) {
  const { d, commit, push, setSheet } = ctx;
  const [tab, setTab] = useState('apps');
  const notifs = [
    ...d.regs
      .filter((r) => r.active && !r.hidden)
      .map((r) => ({ r, next: nextDate(r) }))
      .filter((x) => x.next && daysUntil(x.next) <= 3)
      .map(({ r, next }) => ({ id: 'n' + r.id, t: Date.now(), title: fmt(r.amt) + ' BYN, ' + REG_TYPES[r.type].label.toLowerCase() + ' ' + r.name, text: 'Списание ' + (daysUntil(next) === 0 ? 'сегодня' : 'через ' + daysUntil(next) + ' дн.'), onClick: () => setSheet('reg:' + r.id), unread: true })),
    ...d.hist.slice(0, 8).map((h) => ({
      id: h.id, t: h.t, unread: h.t > d.readAt, onClick: () => push({ id: 'kopi' }), kopi: true,
      title: h.type === 'round' ? 'KOPI: сдача +' + fmt(h.roundup) + ' BYN' : 'KOPI: куплено ' + (h.asset === 'SAFE' ? 'на ' + fmt(h.amount) + ' BYN' : qty(h.qty, h.asset) + ' ' + h.asset),
      text: (h.type === 'round' ? h.merchant + ': ' + fmt(h.a) + ' → ' + fmt(h.rounded) + ' BYN' : 'Пакетная покупка') + ' · ' + when(h.t),
    })),
  ];
  const unread = notifs.filter((n) => n.unread).length;
  return (
    <div className="a-page">
      <Header ctx={ctx} title="Диалоги">
        <button className="a-chatcard" onClick={() => push({ id: 'chat' })}>
          <span className="a-sq red big"><Logo size={26} /></span>
          <span className="a-row-main"><b>Альфа-Чат</b><small>Чат онлайн-поддержки</small></span>
        </button>
      </Header>
      <div className="a-content">
        <div className="a-tabs">
          <button className={tab === 'apps' ? 'on' : ''} onClick={() => setTab('apps')}>Заявки</button>
          <button className={tab === 'notif' ? 'on' : ''} onClick={() => setTab('notif')}>Уведомления {unread > 0 && <i>{unread}</i>}</button>
          <button className={tab === 'news' ? 'on' : ''} onClick={() => setTab('news')}>Новости</button>
        </div>
        {tab === 'apps' && (d.products.length === 0
          ? <Empty icon="clock" title="Нет действующих заявок" text="Здесь будет информация о ваших заявках." />
          : d.products.map((id) => {
            const p = PRODUCTS.find((x) => x.id === id) || { name: (d.offerNames || {})[id] || 'Заявка', color: '#6B3BD6', glyph: '✓' };
            return (
              <button key={id} className="a-lrow" onClick={() => setSheet('product')}>
                <span className="a-sq" style={{ background: p.color, color: '#fff' }}>{p.glyph}</span>
                <span className="a-row-main"><span>{p.name}</span><small className="purple">На рассмотрении</small></span>
              </button>
            );
          }))}
        {tab === 'notif' && (
          <>
            {notifs.map((n) => (
              <button key={n.id} className="a-lrow" onClick={n.onClick}>
                <span className={'a-sq ' + (n.kopi ? 'kopi' : 'light')}>{n.kopi ? 'K' : <Icon name="bell" size={20} />}</span>
                <span className="a-row-main"><span>{n.title}</span><small>{n.text}</small></span>
                {n.unread && <span className="a-unread" />}
              </button>
            ))}
            <button className="a-btn gray" onClick={() => commit((s) => ({ ...s, readAt: Date.now() }))}>Отметить все прочитанными</button>
          </>
        )}
        {tab === 'news' && NEWS.map((n) => (
          <button key={n.t} className="a-news" onClick={() => (n.kopi ? push({ id: 'kopi' }) : setSheet('about'))}>
            <b>{n.t}</b><span>{n.s}</span>
          </button>
        ))}
      </div>
      <footer className="a-footer">
        <div>
          <a href="tel:7333332"><Icon name="phone" size={16} /> 733-33-32</a>
          <button onClick={() => setSheet('contacts')}>Контакты</button>
          <button onClick={() => setSheet('map')}>Банк на карте</button>
        </div>
        <p>© 1999–2026 ЗАО «Альфа-Банк». г. Минск, ул. Сурганова, 43-47. Лицензия на осуществление банковской деятельности НБРБ № 22 от 15.01.2025 г.</p>
      </footer>
    </div>
  );
}

/* ───────────── Витрина ───────────── */
const SHOW = [
  { cat: 'cards', group: 'Оформите нужное', items: [{ id: 'cards', t: 'Карты', art: 'fan' }, { id: 'salary', t: 'Зарплатная карта', s: 'Оформите бесплатную карту с доставкой на дом' }] },
  { cat: 'save', group: 'Накопите на мечту', items: [{ id: 'kopi', t: 'KOPI', s: 'Крипто со сдачи с каждой покупки', art: 'kopi' }, { id: 'safe', t: 'Альфа Сейф', art: 'safe' }, { id: 'dep', t: 'Вклады', s: 'Получайте прибыль от своих сбережений' }, { id: 'piggy', t: 'Копилка', s: 'Откладывайте процент от поступлений' }] },
  { cat: 'credit', group: 'Кредиты', items: [{ id: 'loan', t: 'Кредит наличными', s: 'Решение за 2 минуты' }, { id: 'cc', t: 'Карта «100 дней»', s: 'Без процентов до 100 дней', art: 'red' }] },
  { cat: 'ins', group: 'Страхование', items: [{ id: 'travel', t: 'Путешествия', s: 'Полис онлайн за 3 минуты' }, { id: 'home', t: 'Дом и квартира', s: 'Защита имущества' }] },
];

export function Showcase({ ctx }) {
  const { push, setSheet } = ctx;
  const [cat, setCat] = useState('all');
  const chips = [['all', 'Все'], ['cards', 'Карты'], ['credit', 'Кредиты'], ['save', 'Вклады'], ['ins', 'Страхование']];
  return (
    <div className="a-page">
      <Header ctx={ctx} title="Продукты и услуги" band={false} />
      <div className="a-content">
        <div className="a-chips violet">
          {chips.map(([k, l]) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{l}</button>)}
        </div>
        {SHOW.filter((g) => cat === 'all' || g.cat === cat).map((g) => (
          <div key={g.group} className="a-show-group">
            <h2 className="a-h2">{g.group}</h2>
            <div className="a-show-grid">
              {g.items.map((it) => (
                <button key={it.id} className={'a-show' + (it.art ? ' art-' + it.art : '')} onClick={() => (it.id === 'kopi' ? push({ id: 'kopi' }) : setSheet('offer:' + it.id + ':' + it.t))}>
                  <b>{it.t}</b>
                  {it.s && <span>{it.s}</span>}
                  {it.art && <i className="a-show-art" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Альфа-Чат ───────────── */
const ANSWERS = {
  'Как работает KOPI?': 'Каждая оплата картой округляется вверх, разница копится и пакетом покупает выбранный актив через WhiteBird.',
  'Как отменить подписку?': 'Платежи → Мои подписки и автоплатежи → выберите сервис → «Отписаться». Возобновить можно в «Отключённых».',
  'Где мои деньги из KOPI?': 'Монеты хранятся в кошельке WhiteBird. Вывести можно на Карту Crypto: KOPI → Хранение.',
};

export function Chat({ ctx }) {
  const [msgs, setMsgs] = useState([{ me: false, text: 'Здравствуйте! Я помощник Альфа Банка. Чем помочь?' }]);
  const [text, setText] = useState('');
  const box = useRef(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  const send = (q) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { me: true, text: q }]);
    setText('');
    setTimeout(() => setMsgs((m) => [...m, { me: false, text: ANSWERS[q] || 'Спасибо! Передал вопрос специалисту, ответим в течение минуты.' }]), 600);
  };
  return (
    <>
      <BackHead title="Альфа-Чат" onBack={ctx.pop} />
      <div className="a-chat-screen">
        <div className="a-chat" ref={box}>
          {msgs.map((m, i) => <div key={i} className={'a-msg' + (m.me ? ' me' : '')}>{m.text}</div>)}
        </div>
        <div className="a-chat-quick">
          {Object.keys(ANSWERS).map((q) => <button key={q} onClick={() => send(q)}>{q}</button>)}
        </div>
        <form className="a-send" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" />
          <button type="submit" aria-label="Отправить"><Icon name="send" size={18} /></button>
        </form>
      </div>
    </>
  );
}

/* ───────────── KOPI ───────────── */
export function Kopi({ ctx }) {
  const { d, R, p, commit, buyNow, reset, resetArmed, setSheet, pop } = ctx;
  const A = ASSETS[d.asset];
  const pp = Math.min(100, (d.piggy / d.threshold) * 100);
  const circ = (items, cur, key, lab) =>
    items.map((v) => (
      <button key={v} className={'a-circle' + (v === cur ? ' on' : '')} onClick={() => commit((s) => ({ ...s, [key]: v }))}>
        {lab(v)}
        {v === cur && <span className="a-circle-ok"><Icon name="check" size={11} stroke={3.5} /></span>}
      </button>
    ));
  const holdRows = ASSET_KEYS.filter((a) => d.hold[a].cost > 0 || a === d.asset);
  // Настройки свёрнуты: открыта максимум одна строка, история — последние 3 записи.
  const [fold, setFold] = useState(null);
  const [allHist, setAllHist] = useState(false);
  const toggle = (k) => setFold((f) => (f === k ? null : k));
  return (
    <>
      <BackHead title="KOPI · крипто со сдачи" onBack={pop} right={<span className="a-live-dot" title={R.src} style={{ background: R.live ? GREEN : '#A0A8B4' }} />} />
      <div className="a-layer-body">
        <div className="a-screen">
          <section className="a-kopi-hero">
            <span className="a-muted-inv">Портфель со сдачи · {R.src}</span>
            <b>{fmt(p.value)} BYN</b>
            <div className="a-kh-row"><span>Вложено {fmt(p.invested)} BYN</span><span className="a-kh-pr">{p.invested ? pct(p.pr) : '—'}</span></div>
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
                    <span className="a-row-end"><b>{fmt(v)} BYN</b><small style={{ color: c ? (dd >= 0 ? '#7CF29A' : '#FFB4AE') : undefined }}>{c ? pct(dd) : 'пока пусто'}</small></span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="a-card a-piggy">
            <Ring value={pp} size={68} label={Math.round(pp) + '%'} />
            <div><b>{fmt(d.piggy)} BYN</b><span className="a-muted">из {fmt(d.threshold)} BYN → покупка {A.code}</span></div>
          </section>
          <div className="a-two">
            <button className="a-btn red" onClick={buyNow} disabled={d.piggy <= 0}>{d.piggy > 0 ? 'Купить на ' + fmt(d.piggy) : 'Копилка пуста'}</button>
            <button className="a-btn gray" onClick={() => setSheet('shop')}>Оплатить картой</button>
          </div>

          <h2 className="a-h2">Настройки</h2>
          <div className="a-card a-list">
            <Fold icon={<span className="a-coin lg" style={{ background: A.bg }}>{A.sym}</span>} label="Куда вкладывать" value={A.name} open={fold === 'asset'} onToggle={() => toggle('asset')}>
              {ASSET_KEYS.map((a) => (
                <button key={a} className="a-opt" onClick={() => { commit((s) => ({ ...s, asset: a })); setFold(null); }} aria-pressed={d.asset === a}>
                  <span className="a-coin md" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
                  <span className="a-row-main"><span>{ASSETS[a].name}</span><small>{ASSETS[a].desc}</small></span>
                  <span className={'a-radio' + (d.asset === a ? ' on' : '')}>{d.asset === a && <Icon name="check" size={13} stroke={3} />}</span>
                </button>
              ))}
            </Fold>
            <Fold icon={<span className="a-sq light sm">↑</span>} label="Округлять до" value={fmtInt(d.step) + ' BYN'} open={fold === 'step'} onToggle={() => toggle('step')}>
              <div className="a-circles">{circ([100, 500, 1000], d.step, 'step', (v) => fmtInt(v))}<span className="a-muted">BYN</span></div>
            </Fold>
            <Fold icon={<span className="a-sq light sm">×</span>} label="Множитель сдачи" value={'×' + d.mult} open={fold === 'mult'} onToggle={() => toggle('mult')}>
              <div className="a-circles">{circ([1, 2, 5], d.mult, 'mult', (v) => '×' + v)}</div>
            </Fold>
            <Fold icon={<span className="a-sq light sm">≡</span>} label="Покупать пакетом" value={'от ' + fmtInt(d.threshold) + ' BYN'} open={fold === 'threshold'} onToggle={() => toggle('threshold')}>
              <div className="a-seg">
                {[1000, 2000, 5000].map((v) => <button key={v} className={d.threshold === v ? 'on' : ''} onClick={() => commit((s) => ({ ...s, threshold: v }))}>{fmtInt(v)} BYN</button>)}
              </div>
            </Fold>
            <button className="a-row" onClick={() => setSheet('wallet')}>
              <span className="a-sq sm" style={{ background: '#2470FF', color: '#fff' }}>W</span>
              <span className="a-row-main"><span>Хранение</span><small>Кошелёк WhiteBird</small></span>
              <Icon name="right" size={18} className="a-chev" />
            </button>
          </div>

          <h2 className="a-h2">Округления и покупки · {d.hist.filter((h) => h.type === 'round').length}</h2>
          <div className="a-card a-list">
            {d.hist.slice(0, allHist ? 12 : 3).map((h) => (h.type === 'round' ? (
              <div key={h.id} className="a-row static">
                <span className="a-sq kopi-soft">↑</span>
                <span className="a-row-main"><span>{h.merchant}</span><small>{fmt(h.a)} → {fmt(h.rounded)} BYN · {when(h.t)}</small></span>
                <b className="k">+{fmt(h.roundup)}</b>
              </div>
            ) : (
              <div key={h.id} className="a-row static">
                <span className="a-coin lg" style={{ background: ASSETS[h.asset].bg }}>{ASSETS[h.asset].sym}</span>
                <span className="a-row-main"><span>Покупка {h.asset === 'SAFE' ? 'консервативного' : h.asset}</span><small>{h.asset === 'SAFE' ? 'пакетом' : qty(h.qty, h.asset) + ' ' + h.asset} · {when(h.t)}</small></span>
                <b>{fmt(h.amount)} BYN</b>
              </div>
            )))}
            {d.hist.length > 3 && (
              <button className="a-more" onClick={() => setAllHist(!allHist)} aria-expanded={allHist}>
                {allHist ? 'Свернуть' : 'Показать все · ' + Math.min(12, d.hist.length)}
                <Icon name="chevDown" size={16} stroke={2.6} style={{ transform: allHist ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
            )}
          </div>
          <button className="a-reset" onClick={reset}>{resetArmed ? 'Нажмите ещё раз, чтобы сбросить' : 'Начать демо заново'}</button>
        </div>
      </div>
    </>
  );
}

function Fold({ icon, label, value, open, onToggle, children }) {
  return (
    <div className={'a-fold' + (open ? ' open' : '')}>
      <button className="a-row" onClick={onToggle} aria-expanded={open}>
        {icon}
        <span className="a-row-main"><span>{label}</span></span>
        <span className="a-fold-val">{value}</span>
        <Icon name="chevDown" size={18} stroke={2.4} className="a-chev a-fold-chev" />
      </button>
      {open && <div className="a-fold-body">{children}</div>}
    </div>
  );
}

/* ───────────── Профиль ───────────── */
export function Profile({ ctx }) {
  const { d, commit, pop, setSheet, showToast, reset, resetArmed, setLocked } = ctx;
  const set = (k, v) => commit((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  return (
    <>
      <BackHead title="Профиль" onBack={pop} />
      <div className="a-layer-body">
        <div className="a-screen">
          <section className="a-card a-profile">
            <span className="a-avatar"><Icon name="user" size={28} /></span>
            <div><b>Алексей К.</b><span className="a-muted">+375 29 ••• 12 34</span></div>
          </section>
          <div className="a-card a-list">
            <CabRow icon="grid" label="Мои продукты" sub={(3 + d.products.length) + ' продукта'} onClick={() => setSheet('products')} />
            <CabRow icon="doc" label="Реквизиты счёта" sub="BY20 ALFA 3014 ••••" onClick={() => setSheet('requisites')} />
            <CabRow icon="gift" label="Альфа-бонусы" sub="Кэшбэк и KOPI" onClick={() => setSheet('cashback')} />
            <CabRow icon="pin" label="Банк на карте" onClick={() => setSheet('map')} />
          </div>
          <h2 className="a-h2">Настройки</h2>
          <div className="a-card a-list">
            <CabRow icon="bell" label="Push-уведомления" end={<Switch on={d.settings.push} onChange={(v) => set('push', v)} label="Push" />} />
            <CabRow icon="lock" label="Вход по Face ID" end={<Switch on={d.settings.faceId} onChange={(v) => set('faceId', v)} label="Face ID" />} />
            <CabRow icon="calendar" label="Напоминать о списаниях" sub="За 3 дня до подписки" end={<Switch on={d.settings.remind !== false} onChange={(v) => set('remind', v)} label="Напоминания" />} />
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
          <h2 className="a-h2">Помощь</h2>
          <div className="a-card a-list">
            <CabRow icon="phone" label="Позвонить" sub="733-33-32" href="tel:7333332" />
            <CabRow icon="help" label="О концепте KOPI" onClick={() => setSheet('about')} />
            <CabRow icon="logout" label="Выйти" onClick={() => setLocked(true)} />
          </div>
          <button className="a-reset" onClick={reset}>{resetArmed ? 'Нажмите ещё раз, чтобы сбросить' : 'Сбросить демо-данные'}</button>
        </div>
      </div>
    </>
  );
}

function CabRow({ icon, label, sub, onClick, end, href }) {
  const inner = (
    <>
      <span className="a-sq light sm"><Icon name={icon} size={19} /></span>
      <span className="a-row-main"><span>{label}</span>{sub && <small>{sub}</small>}</span>
      {end || <Icon name="right" size={18} className="a-chev" />}
    </>
  );
  if (href) return <a className="a-row" href={href}>{inner}</a>;
  if (end) return <div className="a-row static">{inner}</div>;
  return <button className="a-row" onClick={onClick}>{inner}</button>;
}
