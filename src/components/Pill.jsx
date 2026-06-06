// Status pill (dispatch tones) — shared by the board and the fleet map.
export default function Pill({ children, tone = 'tk', style = {} }) {
  const map = {
    tk: ['var(--brand-soft)', 'var(--brand-dark)'],
    dn: ['var(--amber-soft)', 'var(--amber-dark)'],
    ok: ['var(--ok-soft)', 'var(--ok-dark)'],
    mut: ['var(--chip)', 'var(--muted)'],
    run: ['rgba(37,99,235,.12)', '#1d4ed8'],
  };
  const [bg, fg] = map[tone] || map.mut;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 9px', borderRadius: 999, background: bg, color: fg, ...style }}>{children}</span>
  );
}
