import { useEffect, useRef, useState } from 'react';
import AlfaApp from './alfa/AlfaApp.jsx';
import WhiteBirdApp from './whitebird/WhiteBirdApp.jsx';
import { ALFA_KEY } from './alfa/model.js';
import { WB_KEY } from './whitebird/model.js';

const APPS = [
  ['alfa', 'Альфа Банк', 'KOPI внутри банка'],
  ['whitebird', 'WhiteBird', 'KOPI в криптобирже'],
];
const PHONE_W = 390;
const PHONE_H = 844;

// Маршрут в hash (#/alfa, #/whitebird) — ссылку на нужный телефон можно отправить.
const readRoute = () => (window.location.hash.replace(/^#\/?/, '') === 'whitebird' ? 'whitebird' : 'alfa');

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [epoch, setEpoch] = useState(0);
  const [scale, setScale] = useState(1);
  const bar = useRef(null);

  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    document.title = route === 'whitebird' ? 'WhiteBird · KOPI' : 'Альфа Банк · KOPI';
    document.documentElement.dataset.app = route;
  }, [route]);

  // Телефон вписывается в окно по высоте и ширине; на узком экране занимает его целиком.
  useEffect(() => {
    const fit = () => {
      const h = bar.current?.offsetHeight ?? 70;
      document.documentElement.style.setProperty('--bar-h', h + 'px');
      setScale(Math.min(1, (window.innerHeight - h - 32) / PHONE_H, (window.innerWidth - 24) / PHONE_W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const select = (id) => {
    window.location.hash = '/' + id;
  };
  const reset = () => {
    try {
      localStorage.removeItem(ALFA_KEY);
      localStorage.removeItem(WB_KEY);
    } catch (e) { /* приватный режим */ }
    setEpoch((x) => x + 1);
  };

  return (
    <div className="stage">
      <div className="demo-bar" ref={bar}>
        <div className="segmented" role="group" aria-label="Чьё приложение">
          {APPS.map(([id, label, sub]) => (
            <button key={id} className={id} aria-pressed={route === id} onClick={() => select(id)}>
              <b>{label}</b>
              <span>{sub}</span>
            </button>
          ))}
        </div>
        <button className="tool link" onClick={reset}>Сбросить демо</button>
      </div>

      <div className="phone-wrap">
        <div className="phone-box" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
          <div className="phone-scale" style={{ transform: `scale(${scale})` }}>
            {route === 'alfa' ? <AlfaApp key={'a' + epoch} /> : <WhiteBirdApp key={'w' + epoch} />}
          </div>
        </div>
      </div>
    </div>
  );
}
