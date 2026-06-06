import { useEffect, useId } from 'react';
import { AdBtn } from './primitives.jsx';

// Centered modal dialog with a translucent backdrop. Closes on Esc / backdrop click.
export function Modal({ title, sub, onClose, children, footer }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,27,34,.38)', backdropFilter: 'blur(2px)', display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ background: 'var(--card)', borderRadius: 18, width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(13,27,34,.28)', animation: 'modalPop .16s ease-out' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <div id={titleId} style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>{children}</div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <AdBtn tone="light" sm onClick={onClose}>Hủy</AdBtn>
          {footer}
        </div>
      </div>
    </div>
  );
}

// Labeled text/number input used inside modals.
export function Field({ label, value, onChange, type = 'text', placeholder, autoFocus }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', font: 'inherit', fontSize: 14, background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
      />
    </label>
  );
}

// Labeled select.
export function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', font: 'inherit', fontSize: 14, background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// Transient toast pinned bottom-center.
export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div key={toast.id} style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 1100, background: 'var(--ink)', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '11px 18px', borderRadius: 12, boxShadow: '0 12px 32px -8px rgba(13,27,34,.5)', animation: 'toastUp .22s ease-out' }}>
      {toast.msg}
    </div>
  );
}
