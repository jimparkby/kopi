// Набор линейных иконок 24×24, цвет наследуется от currentColor.
const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  card: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3 10h18M7 15h4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6 6 18',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  check: 'M5 12.5l4.5 4.5L19 7',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7S10 3 7.5 4 9 7 12 7zM12 7s2-4 4.5-3S15 7 12 7z',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z',
  chat: 'M4 5h16v11H8l-4 4z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  wallet: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13.5h.01',
  send: 'M4 12 20 4l-4 16-4-7z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  chevDown: 'M6 9l6 6 6-6',
  bus: 'M6 4h12a1 1 0 0 1 1 1v11H5V5a1 1 0 0 1 1-1zM5 11h14M8 19v-3M16 19v-3M8 14h.01M16 14h.01',
  school: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  filter: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  unsub: 'M4 4l16 16M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h7M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3h-7',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  pause: 'M8 5v14M16 5v14',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  play: 'M7 4l13 8-13 8z',
};

export function Icon({ name, size = 22, stroke = 2, style, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  );
}

// Залитые иконки в стиле нижнего меню и шапки Альфа Банка: основная форма — currentColor, детали — цветом фона.
const S = {
  pay: (
    <>
      <rect x="2" y="4.5" width="20" height="15" rx="3.5" fill="currentColor" />
      <path d="M7 10h9.5l-2.2-2.2M17 14H7.5l2.2 2.2" stroke="var(--solid-cut, #fff)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 7v5.3l3.2 2" stroke="var(--solid-cut, #fff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  chat: (
    <>
      <path d="M12 2.8c5.3 0 9.5 3.6 9.5 8s-4.2 8-9.5 8c-1 0-2-.1-2.9-.4L4.2 20.8l1.2-4C3.5 15.3 2.5 13.2 2.5 10.8c0-4.4 4.2-8 9.5-8z" fill="currentColor" />
      <path d="M8 9.3h8M8 12.8h5" stroke="var(--solid-cut, #fff)" strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="10.5" rx="1.6" fill="currentColor" />
      <rect x="13" y="3" width="8" height="6.5" rx="1.6" fill="currentColor" />
      <rect x="3" y="15.5" width="8" height="5.5" rx="1.6" fill="currentColor" />
      <rect x="13" y="11.5" width="8" height="9.5" rx="1.6" fill="currentColor" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7.5" r="4.3" fill="currentColor" />
      <path d="M3.5 21c.3-4.6 3.9-7.4 8.5-7.4s8.2 2.8 8.5 7.4z" fill="currentColor" />
    </>
  ),
  exit: (
    <>
      <path d="M13.5 4H19v16h-5.5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" fill="none" />
      <path d="M4 4.6 13.5 2.5v19L4 19.4z" fill="currentColor" />
      <circle cx="10.6" cy="12" r="1.1" fill="var(--solid-cut, #fff)" />
    </>
  ),
};

export function Solid({ name, size = 24, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {S[name]}
    </svg>
  );
}
