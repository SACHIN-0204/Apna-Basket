import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const ToastContext = createContext(null);

const TOAST_DURATION = 2800;
const MAX_TOASTS = 3;

const ICONS = { success: '✓', error: '!', warning: '!', info: 'i' };
const COLORS = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', icon: '#059669' },
  error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '#2563eb' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, options = {}) => {
      const { type = 'success', actionLabel, actionTo, duration = TOAST_DURATION } = options;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [...prev, { id, message, type, actionLabel, actionTo }].slice(-MAX_TOASTS));
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss]
  );

  // Clear all timers when the provider unmounts
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = {
    show,
    success: (msg, opts) => show(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => show(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => show(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => show(msg, { ...opts, type: 'info' }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={containerStyle} aria-live="polite" role="status">
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div
              key={t.id}
              style={{ ...toastStyle, background: c.bg, borderColor: c.border, color: c.text }}
            >
              <span style={{ ...iconStyle, background: c.icon }}>{ICONS[t.type]}</span>
              <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>

              {t.actionLabel && t.actionTo && (
                <Link
                  to={t.actionTo}
                  onClick={() => dismiss(t.id)}
                  style={{ ...actionStyle, color: c.text }}
                >
                  {t.actionLabel}
                </Link>
              )}

              <button onClick={() => dismiss(t.id)} aria-label="Close" style={{ ...closeStyle, color: c.text }}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// Safe fallback: if a component is used outside the provider, nothing crashes
const fallback = {
  show: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {},
};

export const useToast = () => useContext(ToastContext) || fallback;

const containerStyle = {
  position: 'fixed',
  top: 80,
  right: 16,
  left: 16,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 10,
  pointerEvents: 'none', // clicks pass through the empty area
};

const toastStyle = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  maxWidth: 380,
  padding: '12px 14px',
  border: '1px solid',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  fontSize: '0.92rem',
  animation: 'toast-in 220ms ease-out',
};

const iconStyle = {
  flex: '0 0 auto',
  width: 22,
  height: 22,
  borderRadius: '50%',
  color: '#fff',
  fontSize: '0.8rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const actionStyle = { fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' };
const closeStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '1.3rem', lineHeight: 1, padding: '0 2px', opacity: 0.6,
};