import { VND } from '../utils/format.js';

// Dispatch analytics (the 3rd Điều phối view). Static figures, recreated from the design
// prototype — in production these become aggregation queries over trips/bookings.
const ROUTE_STATS = [
  { route: 'Tam Kỳ → Đà Nẵng', fill: 86, trips: 142, rev: 17800000, tone: 'var(--brand)' },
  { route: 'Đà Nẵng → Tam Kỳ', fill: 79, trips: 138, rev: 16400000, tone: 'var(--brand)' },
  { route: 'Đà Nẵng → Huế', fill: 72, trips: 64, rev: 12200000, tone: 'var(--amber)' },
  { route: 'Huế → Đà Nẵng', fill: 68, trips: 61, rev: 11600000, tone: 'var(--amber)' },
  { route: 'Hội An → Đà Nẵng', fill: 91, trips: 88, rev: 6300000, tone: '#2563eb' },
  { route: 'Đà Nẵng → Hội An', fill: 83, trips: 84, rev: 6000000, tone: '#2563eb' },
];
const PEAK = [['05h', 42], ['07h', 88], ['09h', 60], ['11h', 48], ['13h', 55], ['15h', 64], ['17h', 92], ['19h', 76], ['21h', 38]];

function AStat({ k, v, sub, up }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '15px 16px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{k}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: up ? 'var(--ok-dark)' : 'var(--muted)', marginTop: 7 }}>{up ? '▲ ' : ''}{sub}</div>
    </div>
  );
}

export default function Analytics() {
  const totalTrips = ROUTE_STATS.reduce((n, r) => n + r.trips, 0);
  const totalRev = ROUTE_STATS.reduce((n, r) => n + r.rev, 0);
  const avgFill = Math.round(ROUTE_STATS.reduce((n, r) => n + r.fill, 0) / ROUTE_STATS.length);
  const peakMax = Math.max(...PEAK.map((p) => p[1]));

  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <AStat k="Chuyến / tuần" v={totalTrips} sub="+12% so với tuần trước" up />
        <AStat k="Tỉ lệ lấp đầy TB" v={avgFill + '%'} sub="Mục tiêu 80%" up={avgFill >= 80} />
        <AStat k="Doanh thu / tuần" v={VND(totalRev)} sub="+8% so với tuần trước" up />
        <AStat k="Giờ cao điểm" v="17h" sub="92% lấp đầy" />
      </div>

      <div className="split" style={{ '--cols': '1.3fr 1fr' }}>
        {/* fill rate by route */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Tỉ lệ lấp đầy theo tuyến</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>% ghế bán được trên tổng số ghế</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {ROUTE_STATS.map((r) => (
              <div key={r.route}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{r.route}</span>
                  <span style={{ fontWeight: 800, color: r.tone }}>{r.fill}%</span>
                </div>
                <div style={{ height: 9, borderRadius: 99, background: 'var(--chip)', overflow: 'hidden' }}>
                  <div style={{ width: r.fill + '%', height: '100%', background: r.tone, borderRadius: 99, transition: 'width .6s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* peak hours */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Khung giờ cao điểm</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Nhu cầu đặt theo giờ trong ngày</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 180 }}>
            {PEAK.map(([h, v]) => (
              <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)' }}>{v}</div>
                <div style={{ width: '100%', height: `${(v / peakMax) * 100}%`, background: v >= 85 ? 'linear-gradient(180deg,var(--amber),var(--amber-dark))' : 'linear-gradient(180deg,var(--brand),var(--brand-cyan))', borderRadius: 6, minHeight: 6 }} />
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>{h}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* revenue by route table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)', marginTop: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Doanh thu theo tuyến (tuần này)</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 460 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', padding: '0 10px 8px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
              <span>Tuyến</span><span style={{ textAlign: 'right' }}>Chuyến</span><span style={{ textAlign: 'right' }}>Lấp đầy</span><span style={{ textAlign: 'right' }}>Doanh thu</span>
            </div>
            {ROUTE_STATS.map((r, i) => (
              <div key={r.route} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.4fr', fontSize: 13.5, padding: '11px 10px', borderRadius: 9, background: i % 2 ? 'transparent' : 'var(--bg)', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: r.tone }} />{r.route}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.trips}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: r.tone }}>{r.fill}%</span>
                <span style={{ textAlign: 'right', fontWeight: 800 }}>{VND(r.rev)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
