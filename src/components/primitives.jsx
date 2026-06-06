// Shared admin primitives — badges, cards, page headers, buttons, tables.
// Faithful recreation of the prototype's admin-ui.jsx vocabulary.

// status badge
export function Badge({ children, tone }) {
  const map = {
    green: ['#dcfce7', '#15803d'], amber: ['#fef3c7', '#b45309'], red: ['#fee2e2', '#b91c1c'],
    blue: ['#dbeafe', '#1d4ed8'], gray: ['#eef2f6', '#64748b'], teal: ['var(--brand-soft)', 'var(--brand-dark)'],
  };
  const [bg, fg] = map[tone] || map.gray;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: bg, color: fg, whiteSpace: 'nowrap' }}>{children}</span>
  );
}

// section card
export function Panel({ title, sub, right, children, pad = 18, style = {} }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow)', ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
          </div>
          {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

// page header
export function PageHead({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.4 }}>{title}</div>
        {sub && <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
}

export function AdBtn({ children, onClick, tone = 'brand', sm, disabled = false }) {
  const bg = tone === 'brand' ? 'var(--brand)' : tone === 'ok' ? 'var(--ok)' : tone === 'ghost' ? 'transparent' : tone === 'danger' ? '#dc2626' : 'var(--card)';
  const col = tone === 'ghost' || tone === 'light' ? 'var(--ink)' : '#fff';
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{ border: tone === 'ghost' || tone === 'light' ? '1px solid var(--line)' : 'none', borderRadius: 10, padding: sm ? '7px 13px' : '10px 18px', background: bg, color: col, fontWeight: 700, fontSize: sm ? 12.5 : 13.5, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}>{children}</button>
  );
}

// simple table
export function Table({ cols, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols.map((c) => c.w || '1fr').join(' '), fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, padding: '0 12px 10px', borderBottom: '1px solid var(--line)', minWidth: 640 }}>
        {cols.map((c, i) => <span key={i} style={{ textAlign: c.align || 'left' }}>{c.t}</span>)}
      </div>
      <div style={{ minWidth: 640 }}>{children}</div>
    </div>
  );
}

export function TRow({ cols, cells, i }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols.map((c) => c.w || '1fr').join(' '), fontSize: 13.5, padding: '13px 12px', alignItems: 'center', borderRadius: 9, background: i % 2 ? 'transparent' : 'var(--bg)' }}>
      {cells.map((c, j) => <div key={j} style={{ textAlign: cols[j].align || 'left', minWidth: 0 }}>{c}</div>)}
    </div>
  );
}
