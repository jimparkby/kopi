import { useMemo, useState } from 'react';
import { fmt, fmtInt, qty, when, parseAmount, roundUp } from '../shared/format.js';
import { Icon } from '../shared/icons.jsx';
import { Sheet, Switch } from '../shared/ui.jsx';
import { ASSETS, ASSET_KEYS, FAVS, PRESETS, PRODUCTS, BRANCHES, CONTACTS, CAT_COLORS, REG_TYPES, nextDate, daysUntil } from './model.js';
import { RegIcon, openWhiteBird } from './screens.jsx';
import { kq } from '../shared/kopi.js';
import { per } from './regular.jsx';

const EXTRA_TPL = {
  mob: { id: 'mob', name: 'Мобильная связь', amt: 1835, color: '#E30611', glyph: 'М', cat: 'Связь' },
  net: { id: 'net', name: 'Интернет', amt: 1501, color: '#8A5CF6', glyph: 'И', cat: 'Связь' },
};
const dateLong = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export function SheetHost({ ctx }) {
  const { d, sheet, setSheet } = ctx;
  const close = () => setSheet(null);
  const [key, arg] = sheet ? [sheet.split(':')[0], sheet.split(':').slice(1).join(':')] : [null, null];
  const fav = key === 'fav' ? [...FAVS, ...(d.myFavs || [])].find((f) => f.id === arg) || EXTRA_TPL[arg] : null;
  const reg = key === 'reg' ? d.regs.find((r) => r.id === arg) : null;
  const titles = {
    account: [{ usd: 'Текущий счёт в USD', eur: 'Текущий счёт в EUR', other: 'Карта другого банка' }[arg] || 'Текущий счёт', { usd: '··4402', eur: 'VISA ··2702', other: 'VISA ··4417' }[arg] || 'Карта ··7781'],
    alltpl: ['Все шаблоны', ''],
    scan: ['Сканировать QR', 'Наведите камеру на код'],
    package: ['Smart Gold', 'Пакет решений'],
    offer: [arg ? arg.split(':')[1] : '', 'Продукты и услуги'],
    contacts: ['Контакты', 'ЗАО «Альфа-Банк»'],
    products: ['Мои продукты', ''],
    product: ['Оформить продукт', 'Решение онлайн'],
    notif: ['Уведомления', ''],
    transfer: ['Перевод по номеру телефона', 'Без комиссии'],
    card2card: ['С карты на карту', 'На карту любого банка РБ'],
    byreq: ['По реквизитам', 'На счёт в любом банке'],
    exchange: ['Между счетами', 'Обмен BYN ↔ USD по курсу банка'],
    qr: ['Оплата по QR', 'Покажите код на кассе'],
    shop: ['Оплата в магазине', 'Эмулятор кассы: так банк видит покупку'],
    fav: [fav?.name || '', fav ? 'Шаблон · ' + fav.cat : ''],
    newfav: ['Новый шаблон', 'Появится в Избранном'],
    utilities: ['Коммунальные платежи', 'Оплатить разом'],
    taxes: ['Налоги и штрафы', 'Проверка по паспорту'],
    search: ['Поиск', 'Действия и разделы'],
    stats: ['Расходы и доходы', 'За 30 дней'],
    op: ['Операция', ''],
    reg: ['', ''],
    addmenu: ['Добавить', ''],
    wallet: ['Кошелёк WhiteBird', 'Где хранятся монеты KOPI'],
    requisites: ['Реквизиты', 'Текущий счёт Classic'],
    cashback: ['Кэшбэк и бонусы', ''],
    about: ['О концепте KOPI', ''],
    map: ['Отделения и банкоматы', 'Минск'],
  };
  const [title, subtitle] = titles[key] || ['', ''];
  return (
    <Sheet open={!!sheet} onClose={close} title={title} subtitle={subtitle}>
      {key === 'account' && (arg === 'eur' ? <EurSheet ctx={ctx} /> : arg === 'other' ? <OtherCardSheet ctx={ctx} /> : <AccountSheet ctx={ctx} usd={arg === 'usd'} />)}
      {key === 'alltpl' && <AllTplSheet ctx={ctx} />}
      {key === 'scan' && <ScanSheet ctx={ctx} />}
      {key === 'package' && <PackageSheet ctx={ctx} />}
      {key === 'offer' && <OfferSheet ctx={ctx} id={arg.split(':')[0]} title={arg.split(':')[1]} />}
      {key === 'contacts' && <ContactsSheet />}
      {key === 'products' && <ProductsSheet ctx={ctx} />}
      {key === 'product' && <ProductSheet ctx={ctx} />}
      {key === 'notif' && <NotifSheet ctx={ctx} />}
      {key === 'transfer' && <TransferSheet ctx={ctx} who={arg} />}
      {key === 'card2card' && <CardTransferSheet ctx={ctx} />}
      {key === 'byreq' && <ReqTransferSheet ctx={ctx} />}
      {key === 'exchange' && <ExchangeSheet ctx={ctx} />}
      {key === 'qr' && <QrSheet ctx={ctx} />}
      {key === 'shop' && <ShopSheet ctx={ctx} />}
      {key === 'fav' && fav && <FavSheet ctx={ctx} f={fav} />}
      {key === 'newfav' && <NewFavSheet ctx={ctx} />}
      {key === 'utilities' && <UtilitiesSheet ctx={ctx} />}
      {key === 'taxes' && <TaxesSheet ctx={ctx} />}
      {key === 'search' && <SearchSheet ctx={ctx} />}
      {key === 'stats' && <StatsSheet ctx={ctx} />}
      {key === 'op' && <OpSheet ctx={ctx} id={arg} />}
      {key === 'reg' && reg && <RegSheet ctx={ctx} r={reg} />}
      {key === 'addmenu' && <AddMenuSheet ctx={ctx} />}
      {key === 'wallet' && <WalletSheet ctx={ctx} />}
      {key === 'requisites' && <RequisitesSheet ctx={ctx} />}
      {key === 'cashback' && <CashbackSheet ctx={ctx} />}
      {key === 'about' && <AboutSheet />}
      {key === 'map' && <MapSheet />}
    </Sheet>
  );
}

function AmountInput({ value, onChange, cur = 'BYN' }) {
  return (
    <label className="a-amount">
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label="Сумма" />
      <span>{cur}</span>
    </label>
  );
}

function Info({ l, r }) {
  return <div className="a-sheet-info"><span>{l}</span><span>{r}</span></div>;
}

/* ── Счёт ── */
function AccountSheet({ ctx, usd }) {
  const { d, setSheet } = ctx;
  const acts = usd
    ? [['swap', 'Обменять', 'exchange'], ['doc', 'Реквизиты', 'requisites']]
    : [['plus', 'Пополнить', 'topup'], ['send', 'Перевести', 'transfer'], ['bag', 'Оплатить', 'shop'], ['qr', 'QR-код', 'qr'], ['swap', 'Обменять', 'exchange'], ['doc', 'Реквизиты', 'requisites']];
  const [topup, setTopup] = useState(false);
  if (topup) return <TopupForm ctx={ctx} />;
  return (
    <>
      <div className="a-acc-hero">
        <span className={'a-cardthumb lg' + (usd ? ' visa' : '')} />
        <b>{usd ? fmt(d.usd) + ' $' : fmt(d.balance) + ' BYN'}</b>
      </div>
      <div className="a-acts">
        {acts.map(([ic, l, s]) => (
          <button key={l} onClick={() => (s === 'topup' ? setTopup(true) : setSheet(s))}>
            <span><Icon name={ic} size={20} /></span>{l}
          </button>
        ))}
      </div>
    </>
  );
}

function TopupForm({ ctx }) {
  const { commit, setSheet, showToast } = ctx;
  const [amount, setAmount] = useState('100');
  const [src, setSrc] = useState('visa');
  const submit = () => {
    const k = parseAmount(amount, 500000);
    if (!k) return showToast('Неверная сумма', 'От 0,01 до 5 000 BYN');
    const t = Date.now();
    commit((s) => ({ ...s, balance: s.balance + k, ops: [{ id: 'tp' + t, type: 'topup', title: 'Пополнение', amount: k, round: 0, cat: 'Пополнения', t }, ...s.ops] }));
    setSheet(null);
    showToast('Счёт пополнен', '+' + fmt(k) + ' BYN');
  };
  return (
    <>
      <div className="a-opts">
        {[['visa', 'VISA •••• 4417', 'Карта другого банка'], ['erip', 'ЕРИП', 'Наличными или из другого банка']].map(([id, n, s]) => (
          <button key={id} className={'a-opt' + (src === id ? ' on' : '')} onClick={() => setSrc(id)}>
            <Icon name={id === 'erip' ? 'grid' : 'card'} size={20} />
            <span className="a-row-main"><span>{n}</span><small>{s}</small></span>
            <span className={'a-radio' + (src === id ? ' on' : '')}>{src === id && <Icon name="check" size={13} stroke={3} />}</span>
          </button>
        ))}
      </div>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-presets">{['50', '100', '200', '500'].map((v) => <button key={v} onClick={() => setAmount(v)}>{v} BYN</button>)}</div>
      <button className="a-btn red" onClick={submit}>Пополнить</button>
    </>
  );
}

/* ── Продукты ── */
function ProductsSheet({ ctx }) {
  const { d, k, p, setSheet } = ctx;
  return (
    <>
      <div className="a-list flat">
        <div className="a-row static"><span className="a-cardthumb" /><span className="a-row-main"><span>Альфа-Карта Classic ··7781</span><small>{fmt(d.balance)} BYN</small></span></div>
        <div className="a-row static"><span className="a-cardthumb visa" /><span className="a-row-main"><span>Счёт в USD ··4402</span><small>{fmt(d.usd)} $</small></span></div>
        <div className="a-row static"><span className="a-reg-ic" style={{ background: '#8F5CFF' }}>K</span><span className="a-row-main"><span>KOPI · сдача в WhiteBird</span><small>{k.linked ? fmt(p.value) + ' BYN в криптовалюте' : 'Не подключён'}</small></span></div>
        {d.products.map((id) => {
          const p = PRODUCTS.find((x) => x.id === id) || { name: (d.offerNames || {})[id] || 'Заявка', color: '#6B3BD6', glyph: '✓' };
          return (
            <div key={id} className="a-row static">
              <span className="a-reg-ic" style={{ background: p.color }}>{p.glyph}</span>
              <span className="a-row-main"><span>{p.name}</span><small>Заявка на рассмотрении</small></span>
            </div>
          );
        })}
      </div>
      <button className="a-btn red" onClick={() => setSheet('product')}><Icon name="plus" size={18} /> Оформить продукт</button>
    </>
  );
}

function ProductSheet({ ctx }) {
  const { d, commit, setSheet, showToast } = ctx;
  return (
    <div className="a-list flat">
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
            <span className="a-reg-ic" style={{ background: p.color }}>{p.glyph}</span>
            <span className="a-row-main"><span>{p.name}</span><small>{has ? 'Заявка на рассмотрении' : p.desc}</small></span>
            {has ? <span className="a-pill">В работе</span> : <Icon name="right" size={18} className="a-chev" />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Уведомления: напоминания о списаниях и KOPI ── */
function NotifSheet({ ctx }) {
  const { d, commit, setSheet } = ctx;
  const soon = d.regs
    .filter((r) => r.active && !r.hidden)
    .map((r) => ({ ...r, next: nextDate(r) }))
    .filter((r) => r.next && daysUntil(r.next) <= 3)
    .sort((a, b) => a.next - b.next);
  return (
    <>
      <div className="a-list flat">
        {soon.map((r) => (
          <button key={r.id} className="a-row" onClick={() => setSheet('reg:' + r.id)}>
            <RegIcon r={r} />
            <span className="a-row-main">
              <span>{fmt(r.amt)} BYN, {REG_TYPES[r.type].label.toLowerCase()} {r.name}</span>
              <small>Списание {daysUntil(r.next) === 0 ? 'сегодня' : 'через ' + daysUntil(r.next) + ' дн.'}</small>
            </span>
          </button>
        ))}
        {ctx.k.ops.slice(0, 6).map((o) => (
          <button key={o.id} className="a-row" onClick={() => ctx.push({ id: 'kopi' })}>
            <span className="a-reg-ic" style={{ background: '#8F5CFF' }}>K</span>
            <span className="a-row-main">
              <span>+{kq(o.qty, o.asset)} {o.asset} в WhiteBird</span>
              <small>{o.merchant}: сдача {fmt(o.roundup)} BYN · {when(o.t)}</small>
            </span>
            {o.t > d.readAt && <span className="a-unread" />}
          </button>
        ))}
      </div>
      <button className="a-btn gray" onClick={() => commit((s) => ({ ...s, readAt: Date.now() }))}>Отметить все прочитанными</button>
    </>
  );
}

/* ── Переводы ── */
function doTransfer(ctx, k, title, msg) {
  const { d, commit, setSheet, showToast } = ctx;
  if (k > d.balance) return showToast('Недостаточно средств', 'На карте ' + fmt(d.balance) + ' BYN');
  const t = Date.now();
  commit((s) => ({ ...s, balance: s.balance - k, ops: [{ id: 'tr' + t, type: 'transfer', title, amount: -k, round: 0, cat: 'Переводы', t }, ...s.ops] }));
  setSheet(null);
  showToast('Перевод отправлен', msg);
}

function TransferSheet({ ctx, who }) {
  const { d, showToast } = ctx;
  const init = CONTACTS.find((c) => c.name === who) || CONTACTS[0];
  const [to, setTo] = useState(init);
  const [phone, setPhone] = useState(init.phone);
  const [amount, setAmount] = useState('20');
  const submit = () => {
    const k = parseAmount(amount);
    if (!k) return showToast('Неверная сумма', 'Введите сумму перевода');
    if (!/^\+?[\d\s-]{9,}$/.test(phone)) return showToast('Проверьте номер', 'Формат +375 XX XXX-XX-XX');
    const name = to && to.phone === phone ? to.name : phone;
    doTransfer(ctx, k, 'Перевод · ' + name, fmt(k) + ' BYN · ' + name);
  };
  return (
    <>
      <div className="a-contacts">
        {CONTACTS.map((c) => (
          <button key={c.name} className={to?.name === c.name ? 'on' : ''} onClick={() => { setTo(c); setPhone(c.phone); }}>
            <span style={{ background: c.color }}>{c.name[0]}</span>{c.name}
          </button>
        ))}
      </div>
      <label className="a-field"><small>Номер телефона</small><input value={phone} onChange={(e) => { setPhone(e.target.value); setTo(null); }} inputMode="tel" /></label>
      <AmountInput value={amount} onChange={setAmount} />
      <Info l="Без комиссии" r={'Доступно ' + fmt(d.balance) + ' BYN'} />
      <button className="a-btn red" onClick={submit}>Перевести</button>
    </>
  );
}

function CardTransferSheet({ ctx }) {
  const { showToast } = ctx;
  const [card, setCard] = useState('');
  const [amount, setAmount] = useState('50');
  const digits = card.replace(/\D/g, '');
  const submit = () => {
    const k = parseAmount(amount);
    if (digits.length !== 16) return showToast('Проверьте номер карты', 'Нужно 16 цифр');
    if (!k) return showToast('Неверная сумма', 'Введите сумму');
    doTransfer(ctx, k, 'На карту ··' + digits.slice(-4), fmt(k) + ' BYN на карту ··' + digits.slice(-4));
  };
  return (
    <>
      <label className="a-field">
        <small>Номер карты получателя (демо)</small>
        <input value={digits.replace(/(\d{4})(?=\d)/g, '$1 ')} onChange={(e) => setCard(e.target.value.replace(/\D/g, '').slice(0, 16))} inputMode="numeric" placeholder="0000 0000 0000 0000" />
      </label>
      <AmountInput value={amount} onChange={setAmount} />
      <Info l="Комиссия" r="0 BYN по картам Альфа · 1% другим банкам" />
      <button className="a-btn red" onClick={submit}>Перевести</button>
    </>
  );
}

function ReqTransferSheet({ ctx }) {
  const { showToast } = ctx;
  const [iban, setIban] = useState('BY');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('100');
  const submit = () => {
    const v = iban.replace(/\s/g, '').toUpperCase();
    const k = parseAmount(amount);
    if (!/^BY\d{2}[A-Z0-9]{24}$/.test(v)) return showToast('Проверьте номер счёта', 'Формат BY + 26 символов');
    if (!name.trim()) return showToast('Укажите получателя', 'ФИО или название организации');
    if (!k) return showToast('Неверная сумма', 'Введите сумму');
    doTransfer(ctx, k, 'По реквизитам · ' + name.trim(), fmt(k) + ' BYN · ' + v.slice(0, 8) + '…');
  };
  return (
    <>
      <label className="a-field"><small>Счёт получателя (IBAN)</small><input value={iban} onChange={(e) => setIban(e.target.value)} spellCheck={false} /></label>
      <label className="a-field"><small>Получатель</small><input value={name} onChange={(e) => setName(e.target.value)} placeholder="ФИО или организация" /></label>
      <AmountInput value={amount} onChange={setAmount} />
      <button className="a-btn red" onClick={submit}>Перевести</button>
    </>
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
      ops: [{ id: 'ex' + t, type: 'exchange', title: dir === 'buy' ? 'Покупка USD' : 'Продажа USD', amount: dir === 'buy' ? -k : get, round: 0, cat: 'Обмен валюты', t }, ...s.ops],
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
      <div className="a-sheet-info"><span>Получите</span><b>{fmt(get)} {dir === 'buy' ? 'USD' : 'BYN'}</b></div>
      <button className="a-btn red" onClick={submit}>Обменять</button>
    </>
  );
}

function QrSheet({ ctx }) {
  const { d } = ctx;
  // Детерминированный «QR» — визуальная заглушка для концепта.
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
      <div className="a-qr">{cells.map((on, i) => <i key={i} style={{ background: on ? '#0B1F35' : 'transparent' }} />)}</div>
      <Info l="Альфа-Карта Classic" r={fmt(d.balance) + ' BYN'} />
      <p className="a-small">Касса считает код, сумма спишется с карты, сдача уйдёт в KOPI автоматически.</p>
    </>
  );
}

function ShopSheet({ ctx }) {
  const { d, payMany, showToast } = ctx;
  const [amount, setAmount] = useState('6,40');
  const k = parseAmount(amount);
  return (
    <>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-presets">
        {PRESETS.map(([n, a, cat]) => <button key={n} onClick={() => payMany([{ name: n, a, cat }])}>{n} {fmt(a)}</button>)}
      </div>
      <div className="a-sheet-info">
        <span>Classic · {fmt(d.balance)} BYN</span>
        <span className="k">{k ? 'В KOPI +' + fmt(roundUp(k, d.step, d.mult)) + ' BYN' : 'KOPI: до ' + fmtInt(d.step) + ' BYN'}</span>
      </div>
      <button className="a-btn red" onClick={() => (k ? payMany([{ name: 'Покупка', a: k, cat: 'Прочее' }]) : showToast('Неверная сумма', 'Введите сумму, например 6,40'))}>
        Оплатить {k ? fmt(k) + ' BYN' : ''}
      </button>
    </>
  );
}

/* ── Шаблоны ── */
function FavSheet({ ctx, f }) {
  const { d, payMany, push, showToast } = ctx;
  const [amount, setAmount] = useState(fmt(f.amt));
  const k = parseAmount(amount);
  const isTransfer = f.cat === 'Переводы';
  return (
    <>
      <div className="a-sub-hero">
        <span className="a-circ xl" style={{ background: f.color }}>{f.glyph}</span>
      </div>
      <AmountInput value={amount} onChange={setAmount} />
      <div className="a-sheet-info">
        <span>Classic · {fmt(d.balance)} BYN</span>
        <span className="k">{k && !isTransfer ? 'В KOPI +' + fmt(roundUp(k, d.step, d.mult)) + ' BYN' : isTransfer ? 'Переводы без сдачи' : ''}</span>
      </div>
      <button className="a-btn red" onClick={() => (k ? payMany([{ name: f.name, a: k, cat: f.cat, kopi: !isTransfer }]) : showToast('Неверная сумма', 'Введите сумму'))}>
        Оплатить
      </button>
      <button className="a-btn gray" onClick={() => push({ id: 'regForm', type: 'auto', name: f.name, amt: k || f.amt, cat: f.cat })}>
        <Icon name="repeat" size={18} /> Сделать автоплатежом
      </button>
    </>
  );
}

function NewFavSheet({ ctx }) {
  const { commit, setSheet, showToast } = ctx;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const colors = ['#2D9CF0', '#21A038', '#F5A623', '#8A5CF6', '#F0277A'];
  const save = () => {
    const k = parseAmount(amount);
    if (!name.trim()) return showToast('Укажите название', 'Например, «Спортзал»');
    if (!k) return showToast('Укажите сумму', 'Например, 25,00');
    commit((s) => {
      const my = s.myFavs || [];
      return { ...s, myFavs: [...my, { id: 'f' + Date.now(), name: name.trim(), amt: k, color: colors[my.length % colors.length], glyph: name.trim()[0].toUpperCase(), cat: 'Прочее' }] };
    });
    setSheet(null);
    showToast('Шаблон сохранён', name.trim() + ' · в Избранном');
  };
  return (
    <>
      <label className="a-field"><small>Название</small><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Спортзал" /></label>
      <label className="a-field"><small>Сумма</small><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00 BYN" /></label>
      <button className="a-btn red" onClick={save}>Сохранить шаблон</button>
    </>
  );
}

function UtilitiesSheet({ ctx }) {
  const { d, payMany } = ctx;
  const items = FAVS.filter((f) => f.cat === 'ЖКХ');
  const [sel, setSel] = useState(items.map((f) => f.id));
  const chosen = items.filter((f) => sel.includes(f.id));
  const kopi = chosen.reduce((t, f) => t + roundUp(f.amt, d.step, d.mult), 0);
  return (
    <>
      <div className="a-list flat">
        {items.map((f) => {
          const on = sel.includes(f.id);
          return (
            <button key={f.id} className="a-row" onClick={() => setSel(on ? sel.filter((x) => x !== f.id) : [...sel, f.id])} aria-pressed={on}>
              <span className="a-circ sm" style={{ background: f.color }}>{f.glyph}</span>
              <span className="a-row-main"><span>{f.name}</span><small className="k">+{fmt(roundUp(f.amt, d.step, d.mult))} в KOPI</small></span>
              <b>{fmt(f.amt)}</b>
              <span className={'a-radio' + (on ? ' on' : '')}>{on && <Icon name="check" size={13} stroke={3} />}</span>
            </button>
          );
        })}
      </div>
      <Info l="Сдача в KOPI" r={'+' + fmt(kopi) + ' BYN'} />
      <button className="a-btn red" disabled={!chosen.length} onClick={() => payMany(chosen.map((f) => ({ name: f.name, a: f.amt, cat: f.cat })))}>
        Оплатить {fmt(chosen.reduce((t, f) => t + f.amt, 0))} BYN
      </button>
    </>
  );
}

function TaxesSheet({ ctx }) {
  const { d, setSheet } = ctx;
  const bills = d.regs.filter((r) => r.type === 'bill' && r.active && !r.hidden);
  return (
    <>
      <div className="a-list flat">
        {bills.length === 0 && <div className="a-empty">Задолженностей не найдено</div>}
        {bills.map((r) => (
          <button key={r.id} className="a-row" onClick={() => setSheet('reg:' + r.id)}>
            <RegIcon r={r} />
            <span className="a-row-main"><span>{r.name}</span><small style={{ color: REG_TYPES.bill.color }}>Счёт на оплату · до {dateLong(new Date(r.date))}</small></span>
            <b>{fmt(r.amt)}</b>
          </button>
        ))}
      </div>
      <p className="a-small">Проверка выполняется по паспортным данным из профиля раз в сутки.</p>
    </>
  );
}

/* ── Поиск ── */
function SearchSheet({ ctx }) {
  const { go, push, setSheet } = ctx;
  const [q, setQ] = useState('');
  const items = [
    ['Мои подписки', 'repeat', () => push({ id: 'subs' })],
    ['Оплата в магазине', 'bag', () => setSheet('shop')],
    ['Перевод по телефону', 'send', () => setSheet('transfer')],
    ['С карты на карту', 'card', () => setSheet('card2card')],
    ['Обмен валюты', 'swap', () => setSheet('exchange')],
    ['Коммунальные платежи', 'home', () => setSheet('utilities')],
    ['KOPI: настройки сдачи', 'trend', () => push({ id: 'kopi' })],
    ['Открыть WhiteBird', 'trend', openWhiteBird],
    ['История операций', 'clock', () => go('hist')],
    ['Отделения и банкоматы', 'pin', () => setSheet('map')],
    ['Оформить продукт', 'grid', () => setSheet('product')],
    ['Альфа-Чат', 'chat', () => push({ id: 'chat' })],
  ];
  const f = items.filter(([n]) => n.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <label className="a-search">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Подписки, перевод, KOPI…" autoFocus />
      </label>
      <div className="a-list flat">
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

/* ── Расходы и доходы ── */
function StatsSheet({ ctx }) {
  const { d } = ctx;
  const month = d.ops.filter((o) => Date.now() - o.t < 30 * 864e5);
  const spent = month.filter((o) => o.amount < 0).reduce((t, o) => t - o.amount, 0);
  const income = month.filter((o) => o.amount > 0).reduce((t, o) => t + o.amount, 0);
  const kopi = month.reduce((t, o) => t + (o.round || 0), 0);
  const byCat = Object.entries(month.filter((o) => o.amount < 0).reduce((m, o) => ({ ...m, [o.cat || 'Прочее']: (m[o.cat || 'Прочее'] || 0) - o.amount }), {})).sort((a, b) => b[1] - a[1]);
  const max = byCat[0]?.[1] || 1;
  return (
    <>
      <div className="a-rates">
        <div><small>Расходы</small><b>{fmt(spent)}</b></div>
        <div><small>Доходы</small><b className="pos">{fmt(income)}</b></div>
        <div><small>В KOPI</small><b className="k">{fmt(kopi)}</b></div>
      </div>
      <div className="a-bars">
        {byCat.map(([c, v]) => (
          <div key={c} className="a-bar">
            <span>{c}</span>
            <i><em style={{ width: (v / max) * 100 + '%', background: CAT_COLORS[c] || '#8A96A8' }} /></i>
            <b>{fmt(v)}</b>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Операция из истории ── */
function OpSheet({ ctx, id }) {
  const { d, push } = ctx;
  const o = d.ops.find((x) => x.id === id);
  if (!o) return null;
  const isReg = d.regs.some((r) => r.name === o.title && !r.hidden);
  return (
    <>
      <div className="a-sub-hero">
        <span className="a-reg-ic xl" style={{ background: o.amount > 0 ? '#8A96A8' : CAT_COLORS[o.cat] || '#8A96A8' }}>{o.amount > 0 ? <Icon name="down" size={28} /> : o.title[0]}</span>
        <b className={o.amount > 0 ? 'pos' : ''}>{(o.amount > 0 ? '+' : '−') + fmt(Math.abs(o.amount))} BYN</b>
        <span className="a-muted">{o.title} · {when(o.t, true)}</span>
      </div>
      <div className="a-list flat">
        <div className="a-row static"><span className="a-row-main"><small>Категория</small><span>{o.cat || 'Прочее'}</span></span></div>
        {o.round > 0 && (
          <>
            <div className="a-row static"><span className="a-row-main"><small>Покупка</small><span>{fmt(-o.amount - o.round)} BYN</span></span></div>
            <div className="a-row static"><span className="a-row-main"><small>Сдача в KOPI</small><span className="k">+{fmt(o.round)} BYN</span></span></div>
          </>
        )}
        <div className="a-row static"><span className="a-row-main"><small>Статус</small><span>Исполнено</span></span></div>
      </div>
      {o.amount < 0 && !isReg && (
        <div className="a-two">
          <button className="a-btn gray sm" onClick={() => push({ id: 'regForm', type: 'auto', name: o.title, amt: -o.amount - (o.round || 0), cat: o.cat })}>Автоплатёж</button>
          <button className="a-btn gray sm" onClick={() => push({ id: 'regForm', type: 'sub', name: o.title, amt: -o.amount - (o.round || 0), cat: o.cat })}>Подписка</button>
        </div>
      )}
      {isReg && <p className="a-small">Платёж регулярный — он есть в «Моих подписках».</p>}
    </>
  );
}

/* ── Карточка регулярного платежа ── */
function RegSheet({ ctx, r }) {
  const { d, commit, payMany, setSheet, showToast } = ctx;
  const next = nextDate(r);
  const up = roundUp(r.amt, d.step, d.mult);
  const set = (patch) => commit((s) => ({ ...s, regs: s.regs.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }));
  const off = !r.active || r.hidden;
  return (
    <>
      <div className="a-reg-hero">
        <RegIcon r={r} size={64} />
        <b>{fmt(r.amt)} BYN{per(r)}</b>
        <span>{r.name}</span>
        <small>{off ? (r.hidden ? 'Убран из списка регулярных' : 'Отписка оформлена') : next ? 'Следующий платёж ' + next.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : ''}</small>
      </div>
      <div className="a-reg-acts">
        {!off && (
          <button onClick={() => payMany([{ name: r.name, a: r.amt, kopi: r.kopi, cat: r.cat, regId: r.id }])}>
            <span><Icon name="card" size={20} /></span>Оплатить сейчас
          </button>
        )}
        {!off && (
          <button onClick={() => { set({ hidden: true }); setSheet(null); showToast('Убрано из списка', 'Банк больше не считает «' + r.name + '» регулярным'); }}>
            <span><Icon name="unsub" size={20} /></span>Убрать из списка
          </button>
        )}
        {!off && r.type !== 'bill' && (
          <button onClick={() => { set({ active: false }); setSheet(null); showToast('Вы отписались', r.name + ' · можно возобновить в «Отключённых»'); }}>
            <span><Icon name="close" size={20} /></span>Отписаться
          </button>
        )}
        {off && (
          <button onClick={() => { set({ active: true, hidden: false }); setSheet(null); showToast('Платёж возобновлён', r.name); }}>
            <span><Icon name="play" size={18} /></span>Возобновить
          </button>
        )}
      </div>
      <div className="a-list flat">
        <div className="a-row static">
          <span className="a-row-main"><small>Категория</small><span>{r.cat}</span></span>
        </div>
        <div className="a-row static">
          <span className="a-row-main"><small>Карта списания</small><span>Альфа-Карта <i className="a-muted">··7781</i></span></span>
          <span className="a-cardthumb" />
        </div>
        <div className="a-row static">
          <span className="a-row-main"><small>KOPI</small><span>Округлять в KOPI{up ? ' · +' + fmt(up) + ' BYN' : ''}</span></span>
          <Switch on={r.kopi} onChange={(v) => set({ kopi: v })} label="Округлять в KOPI" />
        </div>
      </div>
    </>
  );
}

function AddMenuSheet({ ctx }) {
  const { push } = ctx;
  return (
    <div className="a-plain-list">
      <button className="a-pay-row" onClick={() => push({ id: 'addAuto' })}><Icon name="repeat" size={22} /><span className="a-row-main"><span>Автоплатёж</span></span><Icon name="right" size={18} className="a-chev" /></button>
      <button className="a-pay-row" onClick={() => push({ id: 'addHist', type: 'sub' })}><Icon name="clock" size={22} /><span className="a-row-main"><span>Подписку</span></span><Icon name="right" size={18} className="a-chev" /></button>
    </div>
  );
}

/* ── Прочее ── */
function WalletSheet({ ctx }) {
  const { R, p } = ctx;
  return (
    <>
      <div className="a-list flat">
        {ASSET_KEYS.filter((a) => p.h[a].qty > 0).map((a) => (
          <div key={a} className="a-row static">
            <span className="a-coin lg" style={{ background: ASSETS[a].bg }}>{ASSETS[a].sym}</span>
            <span className="a-row-main"><span>{ASSETS[a].name}</span><small>{kq(p.h[a].qty, a)} {a}</small></span>
            <b>{fmt(p.val(a))} BYN</b>
          </div>
        ))}
      </div>
      <Info l="Курс" r={R.src} />
      <button className="a-btn red" onClick={openWhiteBird}>Открыть WhiteBird</button>
    </>
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
      <div className="a-list flat">
        {rows.map(([l, v]) => <div key={l} className="a-row static"><span className="a-row-main"><small>{l}</small><span>{v}</span></span></div>)}
      </div>
      <button className="a-btn red" onClick={copy}><Icon name="copy" size={18} /> Скопировать</button>
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
        <div><small>В KOPI</small><b className="k">{fmt(kopi)}</b></div>
        <div><small>Категорий</small><b>3</b></div>
      </div>
      <div className="a-list flat">
        {[['Кафе и рестораны', '5%', '#F5A623'], ['Такси', '3%', '#111827'], ['Онлайн-подписки', '2%', '#8A5CF6']].map(([n, v, c]) => (
          <div key={n} className="a-row static">
            <span className="a-reg-ic" style={{ background: c }}>%</span>
            <span className="a-row-main"><span>{n}</span><small>до конца месяца</small></span>
            <b>{v}</b>
          </div>
        ))}
      </div>
    </>
  );
}

function AboutSheet() {
  return (
    <div className="a-about">
      <p><b>KOPI</b> округляет каждую оплату картой вверх до 1, 5 или 10 BYN. Разница копится в копилке.</p>
      <p>Когда копилка достигает порога, KOPI одним пакетом покупает BTC, ETH или консервативный BYN-инструмент. Покупку проводит WhiteBird, резидент ПВТ.</p>
      <p>«Мои подписки» собирают подписки, автоплатежи и счета в одном месте: календарь списаний, подсказки, отписка в один тап.</p>
      <p>Это интерактивный концепт: оплаты эмулируются, курсы — живые (НБРБ, Dzengi, CoinGecko).</p>
    </div>
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
      <div className="a-list flat">
        {BRANCHES.map((b) => (
          <a key={b.name} className="a-row" href={q(b)} target="_blank" rel="noreferrer">
            <span className="a-reg-ic" style={{ background: '#EF3124' }}><Icon name="pin" size={18} /></span>
            <span className="a-row-main"><span>{b.name}</span><small>{b.addr} · {b.hours}</small></span>
            <span className="a-row-end"><b>{b.dist}</b><small>маршрут</small></span>
          </a>
        ))}
      </div>
    </>
  );
}

/* ── Новые шторки под приложение Альфа Банка Беларусь ── */
function EurSheet({ ctx }) {
  const { setSheet } = ctx;
  return (
    <>
      <div className="a-acc-hero"><span className="a-cardart gold lg">VISA</span><b>0 €</b></div>
      <p className="a-small">Пополните счёт в евро обменом с BYN или USD — по курсу банка, круглосуточно.</p>
      <button className="a-btn red" onClick={() => setSheet('exchange')}>Обменять валюту</button>
      <button className="a-btn gray" onClick={() => setSheet('requisites')}>Реквизиты</button>
    </>
  );
}

function OtherCardSheet({ ctx }) {
  const [topup, setTopup] = useState(false);
  if (topup) return <TopupForm ctx={ctx} />;
  return (
    <>
      <div className="a-acc-hero"><span className="a-cardart blue lg" /><b>VISA ··4417</b></div>
      <p className="a-small">Карта другого банка привязана для пополнения счетов Альфа Банка без комиссии.</p>
      <button className="a-btn red" onClick={() => setTopup(true)}>Пополнить с этой карты</button>
      <button className="a-btn gray" onClick={() => { ctx.setSheet(null); ctx.showToast('Карта отвязана', 'VISA ··4417 (демо — вернётся после перезагрузки)'); }}>Отвязать карту</button>
    </>
  );
}

function AllTplSheet({ ctx }) {
  const { d, setSheet } = ctx;
  const favs = [...FAVS, ...(d.myFavs || []), EXTRA_TPL.mob, EXTRA_TPL.net];
  return (
    <>
      <div className="a-list flat">
        {favs.map((f) => (
          <button key={f.id} className="a-row" onClick={() => setSheet('fav:' + f.id)}>
            <span className="a-sq" style={{ background: f.color, color: '#fff' }}>{f.glyph}</span>
            <span className="a-row-main"><span>{f.name}</span><small>{f.cat}</small></span>
            <b>{fmt(f.amt)}</b>
          </button>
        ))}
      </div>
      <button className="a-btn gray" onClick={() => setSheet('newfav')}><Icon name="plus" size={18} /> Новый шаблон</button>
    </>
  );
}

function ScanSheet({ ctx }) {
  const { payMany } = ctx;
  const [found, setFound] = useState(false);
  return (
    <>
      <div className={'a-scanner' + (found ? ' found' : '')}>
        <span className="a-scan-frame" />
        <span className="a-scan-line" />
      </div>
      {found ? (
        <>
          <div className="a-sheet-info"><span>Кафе «Лёгкий завтрак»</span><b>12,30 BYN</b></div>
          <button className="a-btn red" onClick={() => payMany([{ name: 'Кафе «Лёгкий завтрак»', a: 1230, cat: 'Кафе' }])}>Оплатить 12,30 BYN</button>
        </>
      ) : (
        <button className="a-btn red" onClick={() => setFound(true)}>Распознать код (демо)</button>
      )}
    </>
  );
}

function PackageSheet({ ctx }) {
  const { showToast, setSheet } = ctx;
  return (
    <>
      <div className="a-list flat">
        {[['Кэшбэк до 5%', 'в выбранных категориях'], ['Бесплатные переводы', 'по номеру телефона и карты'], ['KOPI ×2', 'удвоенная сдача без доплаты'], ['Страховка путешествий', 'на всю семью']].map(([t, s]) => (
          <div key={t} className="a-row static"><span className="a-sq gold sm"><Icon name="check" size={16} stroke={3} /></span><span className="a-row-main"><span>{t}</span><small>{s}</small></span></div>
        ))}
      </div>
      <div className="a-sheet-info"><span>Статус</span><b className="purple">В процессе оформления</b></div>
      <button className="a-btn red" onClick={() => { setSheet(null); showToast('Проверим статус', 'Пакет Smart Gold будет активирован в течение дня'); }}>Узнать статус</button>
    </>
  );
}

function OfferSheet({ ctx, id, title }) {
  const { d, commit, setSheet, showToast } = ctx;
  const key = 'offer-' + id;
  const has = d.products.includes(key);
  return (
    <>
      <p className="a-small">Оформите «{title}» онлайн: заявка появится в разделе «Диалоги → Заявки», решение придёт в течение пары минут.</p>
      <button
        className="a-btn red"
        disabled={has}
        onClick={() => {
          commit((s) => ({ ...s, products: [...s.products, key], offerNames: { ...(s.offerNames || {}), [key]: title } }));
          setSheet(null);
          showToast('Заявка отправлена', title);
        }}
      >
        {has ? 'Заявка уже отправлена' : 'Оформить'}
      </button>
    </>
  );
}

function ContactsSheet() {
  return (
    <div className="a-list flat">
      <a className="a-row" href="tel:7333332"><span className="a-sq light sm"><Icon name="phone" size={18} /></span><span className="a-row-main"><span>733-33-32</span><small>A1, life:), МТС — бесплатно</small></span></a>
      <a className="a-row" href="tel:+375173333232"><span className="a-sq light sm"><Icon name="phone" size={18} /></span><span className="a-row-main"><span>+375 17 333-32-32</span><small>Из-за рубежа</small></span></a>
      <div className="a-row static"><span className="a-sq light sm"><Icon name="pin" size={18} /></span><span className="a-row-main"><span>г. Минск, ул. Сурганова, 43-47</span><small>Головной офис</small></span></div>
    </div>
  );
}
