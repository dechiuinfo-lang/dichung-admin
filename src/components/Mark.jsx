// Brand mark — the "Đi" rounded gradient square with soft teal glow.
export default function Mark({ size = 30, radius }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.3,
        background: 'linear-gradient(135deg, var(--brand), var(--brand-cyan))',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontWeight: 800,
        fontSize: size * 0.46,
        letterSpacing: -0.5,
        boxShadow: '0 4px 12px rgba(13,148,136,0.35)',
      }}
    >
      Đi
    </div>
  );
}
