import { useCallback, useEffect, useRef, useState } from 'react';

/** Состояние, которое переживает перезагрузку страницы. */
export function usePersisted(key, init, validate = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const v = JSON.parse(raw);
        if (validate(v)) return v;
      }
    } catch (e) { /* приватный режим */ }
    return typeof init === 'function' ? init() : init;
  });
  // Пишем только после изменений: начальное состояние не сохраняется, пока пользователь ничего не сделал.
  const initial = useRef(value);
  useEffect(() => {
    if (value === initial.current) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

/** Тост сверху экрана телефона. */
export function useToast() {
  const [toast, setToast] = useState({ title: '', text: '', on: false });
  const timer = useRef();
  const show = useCallback((title, text = '') => {
    setToast({ title, text, on: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 3400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [toast, show];
}

/** Действие, которое срабатывает со второго нажатия (защита от случайного сброса). */
export function useArmed(ms = 3000) {
  const [armed, setArmed] = useState(false);
  const timer = useRef();
  const trigger = useCallback((action) => {
    clearTimeout(timer.current);
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), ms);
      return;
    }
    setArmed(false);
    action();
  }, [armed, ms]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [armed, trigger];
}
