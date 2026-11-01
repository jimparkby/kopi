import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';

function useClock() {
  const fmt = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const iv = setInterval(() => setT(fmt()), 15000);
    return () => clearInterval(iv);
  }, []);
  return t;
}

/** Рамка телефона на десктопе, полноэкранное приложение на мобильном. */
export function Phone({ theme, children }) {
  const time = useClock();
  return (
    <div className={'phone ' + theme}>
      <div className="phone-screen">
        <div className="status-bar">
          <span>{time}</span>
          <span className="battery" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ toast, badge }) {
  return (
    <div className={'toast' + (toast.on ? ' on' : '')} role="status" aria-live="polite">
      <span className="toast-badge">{badge}</span>
      <div className="toast-body">
        <b>{toast.title}</b>
        {toast.text && <span>{toast.text}</span>}
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, subtitle, children }) {
  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={onClose} />
      <div className={'sheet' + (open ? ' on' : '')} role="dialog" aria-hidden={!open} aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="sheet-titles">
            <b>{title}</b>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </div>
        {open && children}
      </div>
    </>
  );
}

/** Карта тарифа «Премиум»: матовый графит и строгая типографика, одна на оба приложения. */
export function PremiumCard({ label, value }) {
  return (
    <div className="prem-card">
      <div className="prem-card-top"><b>KOPI</b><span>PREMIUM</span></div>
      <div className="prem-card-bottom">
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/** Миниатюра той же карты для строк меню. */
export function PremiumMark() {
  return <span className="prem-mark" aria-hidden="true"><i /></span>;
}

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={'switch' + (on ? ' on' : '')}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
    >
      <span />
    </button>
  );
}

