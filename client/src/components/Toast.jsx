import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

/* ─── Toast store ─────────────────────────────────────────────── */
let _addToast = null;

function registerAdder(fn) {
  _addToast = fn;
}

/* ─── Public API ─────────────────────────────────────────────── */
function createToast(type, message) {
  if (_addToast) {
    _addToast({ id: Date.now() + Math.random(), type, message });
  } else {
    console.warn('[Toast] ToastProvider not mounted yet:', message);
  }
}

export const toast = Object.assign(
  (message) => createToast('info', message),
  {
    success: (message) => createToast('success', message),
    error:   (message) => createToast('error',   message),
    info:    (message) => createToast('info',     message),
    warn:    (message) => createToast('warn',     message),
  }
);

/* ─── Config per type ────────────────────────────────────────── */
const TYPE_CONFIG = {
  success: { color: '#22a85a', bg: '#22a85a12', icon: '✓', label: 'Éxito' },
  error:   { color: '#cc2244', bg: '#cc224412', icon: '✕', label: 'Error' },
  info:    { color: '#0052FF', bg: '#0052FF14', icon: 'ℹ', label: 'Info'  },
  warn:    { color: '#d4650a', bg: '#d4650a12', icon: '⚠', label: 'Aviso' },
};

/* ─── Single Toast Item ──────────────────────────────────────── */
function ToastItem({ item, onRemove }) {
  const [visible, setVisible] = useState(false);
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;

  useEffect(() => {
    // Trigger slide-in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 4 seconds
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 300);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [item.id, onRemove]);

  function dismiss() {
    setVisible(false);
    setTimeout(() => onRemove(item.id), 300);
  }

  return (
    <div
      onClick={dismiss}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: '#fff',
        border: `1px solid ${cfg.color}33`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(15,23,42,.12)',
        cursor: 'pointer',
        minWidth: 260,
        maxWidth: 360,
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform .28s cubic-bezier(0.4,0,0.2,1), opacity .28s ease',
        fontFamily: 'Inter, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: cfg.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: cfg.color,
        fontWeight: 700,
        fontSize: 14,
        flexShrink: 0,
        marginTop: 1,
      }}>
        {cfg.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, marginBottom: 2 }}>
          {cfg.label}
        </div>
        <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {item.message}
        </div>
      </div>

      {/* Close */}
      <div style={{
        color: '#94a3b8',
        fontSize: 16,
        lineHeight: 1,
        flexShrink: 0,
        marginTop: 1,
        transition: 'color .12s',
      }}>
        ×
      </div>
    </div>
  );
}

/* ─── Toast Container ────────────────────────────────────────── */
export function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((item) => {
    setToasts(prev => {
      const next = [...prev, item];
      // Max 4 visible at once — drop oldest
      return next.length > 4 ? next.slice(next.length - 4) : next;
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    registerAdder(addToast);
    return () => { if (_addToast === addToast) _addToast = null; };
  }, [addToast]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(item => (
        <div key={item.id} style={{ pointerEvents: 'all' }}>
          <ToastItem item={item} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}

export default ToastProvider;
