import { useEffect, useRef, useState } from 'react';
import { fmt, fmtInt, pct, qty, when, roundUp } from '../shared/format.js';
import { kq } from '../shared/kopi.js';
import { useArmed } from '../shared/hooks.js';
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

function ProdRow({ icon, top, main, sub, subColor, onClick, plain }) {
  return (
    <button className="a-prod" onClick={onClick}>
      {icon}
      <span className="a-prod-text">
        {top && <span className="a-prod-top">{top}</span>}
        <b style={plain ? { fontWeight: 400 } : undefined}>{main}</b>
        {sub && <span className="a-prod-sub" style={{ color: subColor }}>{sub}</span>}
      </span>
    </button>
  );
}

/* ───────────── Главная = Мои продукты ───────────── */
// Повторяет главную Альфа Банка: те же четыре секции. KOPI — строка-счёт в «Картах и счетах».
export function Home({ ctx }) {
  const { d, k, R, p, push, setSheet } = ctx;
  const total = d.balance + Math.round(d.usd * R.usd);

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

        <Section title="Пакет решений">
          <ProdRow icon={<span className="a-sq gold"><Icon name="card" size={22} /></span>} main="Smart Gold" plain sub="В процессе" subColor="var(--purple)" onClick={() => setSheet('package')} />
        </Section>

        <Section title="Карты и счета">
          <ProdRow icon={<span className="a-cardart pink" />} top="9.7781 | Текущий счет" main={<>{fmt(d.balance)} <Byn /></>} onClick={() => setSheet('account:byn')} />
          <ProdRow icon={<span className="a-sq orange">$</span>} top="Текущий счет" main={fmt(d.usd) + ' $'} onClick={() => setSheet('account:usd')} />
          <ProdRow icon={<span className="a-cardart gold">VISA</span>} top="4.2702 | Текущий счет" main="0 €" onClick={() => setSheet('account:eur')} />
          <ProdRow
            icon={<span className="a-sq kopi">K</span>}
            top="KOPI | Сдача в крипто · WhiteBird"
            main={k.linked ? <>{fmt(p.value)} <Byn /></> : 'Не подключён'}
            plain={!k.linked}
            sub={k.linked ? (k.ops.length ? 'Покупок со сдачи: ' + k.ops.length + ' · ' + k.asset : 'Оплатите картой — сдача купит ' + k.asset) : 'Подключить за 1 шаг'}
            subColor="var(--purple)"
            onClick={() => push({ id: 'kopi' })}
          />
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
  const { k, p } = ctx;
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
            <span>{k.linked ? 'В WhiteBird ' + fmt(p.value) + ' BYN · ' + k.asset : 'Сдача с покупок → криптовалюта в WhiteBird'}</span>
          </span>
          <span className="a-sq kopi">K</span>
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
  { t: 'KOPI: крипто со сдачи', s: 'Сдача с каждой покупки сразу уходит в WhiteBird и покупает BTC, ETH или USDT.', kopi: true },
  { t: 'Мои подписки', s: 'Подписки, автоплатежи и счета — в одном месте с календарём списаний.' },
  { t: 'Карта Crypto Mastercard', s: 'Выводите криптовалюту из WhiteBird и платите в любом магазине.' },
];

export function Dialogs({ ctx }) {
  const { d, k, commit, push, setSheet } = ctx;
  const [tab, setTab] = useState('apps');
  const notifs = [
    ...d.regs
      .filter((r) => r.active && !r.hidden)
      .map((r) => ({ r, next: nextDate(r) }))
      .filter((x) => x.next && daysUntil(x.next) <= 3)
      .map(({ r, next }) => ({ id: 'n' + r.id, t: Date.now(), title: fmt(r.amt) + ' BYN, ' + REG_TYPES[r.type].label.toLowerCase() + ' ' + r.name, text: 'Списание ' + (daysUntil(next) === 0 ? 'сегодня' : 'через ' + daysUntil(next) + ' дн.'), onClick: () => setSheet('reg:' + r.id), unread: true })),
    ...k.ops.slice(0, 8).map((o) => ({
      id: o.id, t: o.t, unread: o.t > d.readAt, onClick: () => push({ id: 'kopi' }), kopi: true,
      title: 'KOPI: +' + kq(o.qty, o.asset) + ' ' + o.asset + ' в WhiteBird',
      text: o.merchant + ': сдача ' + fmt(o.roundup) + ' BYN · ' + when(o.t),
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
/** Открыть WhiteBird сразу на экране KOPI — там видно, что сдача пришла и купила монету. */
export const openWhiteBird = () => {
  try { sessionStorage.setItem('kopi.open', '1'); } catch (e) { /* ignore */ }
  window.location.hash = '/whitebird';
};

export function Kopi({ ctx }) {
  const { d, k, setK, R, p, reset, resetArmed, setSheet, pop, showToast } = ctx;
  const [allHist, setAllHist] = useState(false);
  const [linking, setLinking] = useState(false);
  const [offArmed, armOff] = useArmed();
  const A = ASSETS[k.asset];
  // Пример на чашке кофе пересчитывается вместе с настройками; оценка в месяц — средняя сдача × 40 покупок.
  const sample = roundUp(640, k.step, k.mult);
  const monthly = Math.round((40 * k.step * k.mult) / 2);
  const catOf = Object.fromEntries(d.ops.map((o) => ['k' + o.id.slice(1), o.cat]));
  const held = ASSET_KEYS.filter((a) => p.h[a].qty > 0);
  const set = (patch) => setK((s) => ({ ...s, ...patch }));

  const link = () => {
    if (linking) return;
    setLinking(true);
    setTimeout(() => {
      setLinking(false);
      set({ linked: true });
      showToast('KOPI подключён', 'Карта ··' + k.card + ' связана с кошельком WhiteBird');
    }, 1200);
  };

  const pick = (
    <>
      <h2 className="a-h2">Во что вкладывать</h2>
      <div className="a-pick">
        {ASSET_KEYS.map((a) => (
          <button key={a} className={'a-pick-tile' + (k.asset === a ? ' on' : '')} onClick={() => set({ asset: a })} aria-pressed={k.asset === a}>
            <span className="a-coin md" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
            <b>{ASSETS[a].name}</b>
            <small>{ASSETS[a].risk}</small>
            {k.asset === a && <span className="a-pick-ok"><Icon name="check" size={11} stroke={3.5} /></span>}
          </button>
        ))}
      </div>
    </>
  );

  // Цепочка, ради которой всё и затевалось: карта Альфы → сдача → WhiteBird → монета.
  const flow = (
    <div className="a-flow">
      <div className="a-flow-step">
        <span className="a-sq red sm"><Logo size={18} /></span>
        <b>Карта ··{k.card}</b>
        <small>Кофе {fmt(640)}</small>
      </div>
      <Icon name="right" size={16} className="a-flow-arr" />
      <div className="a-flow-step">
        <span className="a-sq kopi sm">K</span>
        <b>Сдача</b>
        <small>+{fmt(sample)} BYN</small>
      </div>
      <Icon name="right" size={16} className="a-flow-arr" />
      <div className="a-flow-step">
        <span className="a-sq sm" style={{ background: '#2470FF', color: '#fff' }}>W</span>
        <b>WhiteBird</b>
        <small>покупает {A.code}</small>
      </div>
    </div>
  );

  if (!k.linked) {
    return (
      <>
        <BackHead title="KOPI · крипто со сдачи" onBack={pop} />
        <div className="a-layer-body">
          <div className="a-screen">
            <section className="a-kopi-intro">
              <b>Сдача с каждой покупки — сразу в криптовалюту</b>
              <span>Платите картой Альфа Банка как обычно. Сумма округляется вверх, разница мгновенно уходит в ваш кошелёк WhiteBird и покупает выбранную монету.</span>
            </section>
            {flow}
            {pick}
            <button className="a-btn red" onClick={link} disabled={linking}>
              {linking ? 'Подключаем WhiteBird…' : 'Подключить KOPI к карте ··' + k.card}
            </button>
            <p className="a-kopi-fine">Покупку проводит WhiteBird — резидент ПВТ. Банк передаёт только сумму сдачи.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <BackHead title="KOPI · крипто со сдачи" onBack={pop} right={<span className="a-live-dot" title={R.src} style={{ background: R.live ? GREEN : '#A0A8B4' }} />} />
      <div className="a-layer-body">
        <div className="a-screen">
          <section className="a-kopi-hero">
            <span className="a-muted-inv">В кошельке WhiteBird · {R.src}</span>
            <b>{fmt(p.value)} BYN</b>
            <div className="a-kh-row"><span>Сдачей вложено {fmt(p.invested)} BYN</span><span className="a-kh-pr">{p.invested ? pct(p.pr) : '—'}</span></div>
            {held.length > 0 && (
              <div className="a-holds">
                {held.map((a) => {
                  const c = p.h[a].cost;
                  const v = p.val(a);
                  const dd = c ? ((v - c) / c) * 100 : 0;
                  return (
                    <div key={a} className="a-hold">
                      <span className="a-coin lg" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
                      <span className="a-row-main"><span>{ASSETS[a].name}</span><small>{kq(p.h[a].qty, a)} {a}</small></span>
                      <span className="a-row-end"><b>{fmt(v)} BYN</b><small style={{ color: dd >= 0 ? '#7CF29A' : '#FFB4AE' }}>{pct(dd)}</small></span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          {flow}
          <div className="a-two">
            <button className="a-btn red" onClick={() => setSheet('shop')}>Оплатить картой</button>
            <button className="a-btn gray" onClick={openWhiteBird}>Открыть WhiteBird</button>
          </div>

          {pick}

          <h2 className="a-h2">Как копится сдача</h2>
          <div className="a-card a-tune">
            <div className="a-tune-demo">
              <span className="a-reg-ic" style={{ background: CAT_COLORS.Кафе }}>К</span>
              <span className="a-row-main"><span>Кофе {fmt(640)} BYN</span><small>спишется {fmt(640 + sample)} BYN</small></span>
              <b className="k">+{fmt(sample)}</b>
            </div>
            <Tune label="Округлять до" items={[100, 500, 1000]} cur={k.step} lab={(v) => fmtInt(v) + ' BYN'} set={(v) => set({ step: v })} />
            <Tune label="Множитель сдачи" items={[1, 2, 5]} cur={k.mult} lab={(v) => '×' + v} set={(v) => set({ mult: v })} />
            <span className="a-tune-note">≈ {fmt(monthly)} BYN в месяц при 40 покупках</span>
          </div>

          <h2 className="a-h2">Сдача и покупки</h2>
          {k.ops.length === 0 ? (
            <div className="a-card a-kopi-empty">
              <span>Пока пусто. Оплатите что-нибудь картой — сдача сразу появится здесь и в WhiteBird.</span>
            </div>
          ) : (
            <div className="a-card a-list">
              {k.ops.slice(0, allHist ? 20 : 3).map((o) => (
                <div key={o.id} className="a-row static">
                  <span className="a-reg-ic" style={{ background: CAT_COLORS[catOf[o.id]] || '#8A96A8' }}>{o.merchant[0]}</span>
                  <span className="a-row-main"><span>{o.merchant}</span><small>{fmt(o.a)} → {fmt(o.a + o.roundup)} BYN · {when(o.t)}</small></span>
                  <span className="a-row-end"><b className="k">+{fmt(o.roundup)}</b><small>{kq(o.qty, o.asset)} {o.asset}</small></span>
                </div>
              ))}
              {k.ops.length > 3 && (
                <button className="a-more" onClick={() => setAllHist(!allHist)} aria-expanded={allHist}>
                  {allHist ? 'Свернуть' : 'Ещё ' + (Math.min(20, k.ops.length) - 3)}
                  <Icon name="chevDown" size={16} stroke={2.6} style={{ transform: allHist ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              )}
            </div>
          )}
          <button className="a-reset" onClick={() => armOff(() => { set({ linked: false }); showToast('KOPI отключён', 'Монеты остались в кошельке WhiteBird'); })}>
            {offArmed ? 'Нажмите ещё раз, чтобы отключить' : 'Отключить KOPI'}
          </button>
          <button className="a-reset" onClick={reset}>{resetArmed ? 'Нажмите ещё раз, чтобы сбросить' : 'Начать демо заново'}</button>
        </div>
      </div>
    </>
  );
}

/** Строка настройки: подпись и сегменты, всё на виду — без раскрытия. */
function Tune({ label, items, cur, lab, set }) {
  return (
    <div className="a-tune-row">
      <span>{label}</span>
      <div className="a-seg">
        {items.map((v) => <button key={v} className={cur === v ? 'on' : ''} onClick={() => set(v)}>{lab(v)}</button>)}
      </div>
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
