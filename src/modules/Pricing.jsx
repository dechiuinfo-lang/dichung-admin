import { PageHead, Panel, AdBtn, Badge } from '../components/primitives.jsx';
import { VND } from '../utils/format.js';
import { A_CARTYPES } from '../data/mockData.js';
import { useData } from '../store.jsx';

function NumField({ label, v, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <input value={v} onChange={(e) => onChange(+e.target.value.replace(/\D/g, '') || 0)} style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px', font: 'inherit', fontSize: 14, fontWeight: 700, background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

// Estimated pooled fare: distance × per-km, rounded to 1.000đ, but never below the
// configured minimum fee (Phí tối thiểu) — so editing that field has a real effect.
const estimate = (c) => Math.max(Math.round((c.km * c.perKm) / 1000) * 1000, c.base);

export default function MPricing() {
  const { corridors, setCorridor, surge, setSurge, savePricing } = useData();
  return (
    <div>
      <PageHead title="Bảng giá & Tuyến" sub="Cấu hình giá vé, hệ số giờ cao điểm và loại xe" action={<AdBtn sm onClick={savePricing}>Lưu thay đổi</AdBtn>} />
      <div className="split" style={{ '--cols': '1.4fr 1fr' }}>
        <Panel title="Hành lang tuyến" sub="Giá xe ghép = giá/km × quãng đường (không thấp hơn phí tối thiểu)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {corridors.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 13, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.name}</div>
                  <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'Đang mở' : 'Tạm dừng'}</Badge>
                  <button role="switch" aria-checked={c.active} aria-label={c.active ? 'Tạm dừng tuyến' : 'Mở tuyến'} onClick={() => setCorridor(c.id, { active: !c.active })} style={{ marginLeft: 'auto', position: 'relative', width: 40, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', background: c.active ? 'var(--brand)' : 'var(--line)' }}>
                    <span style={{ position: 'absolute', top: 2.5, left: c.active ? 19 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  <NumField label="Khoảng cách (km)" v={c.km} onChange={(v) => setCorridor(c.id, { km: v })} />
                  <NumField label="Giá / km (đ)" v={c.perKm} onChange={(v) => setCorridor(c.id, { perKm: v })} />
                  <NumField label="Phí tối thiểu (đ)" v={c.base} onChange={(v) => setCorridor(c.id, { base: v })} />
                </div>
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>Giá ghép ước tính: <b style={{ color: 'var(--brand-dark)' }}>{VND(estimate(c))}</b> / chỗ · {c.trips} chuyến/ngày</div>
              </div>
            ))}
          </div>
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Hệ số giờ cao điểm">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--amber-dark)' }}>{surge.toFixed(1)}×</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>áp dụng 17h–19h</div>
            </div>
            <input type="range" min="1" max="2" step="0.1" value={surge} onChange={(e) => setSurge(+e.target.value)} style={{ width: '100%', marginTop: 12, accentColor: 'var(--brand)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}><span>1.0× (tắt)</span><span>2.0×</span></div>
          </Panel>
          <Panel title="Loại xe (bao xe)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {A_CARTYPES.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.label}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>hệ số ×{c.mult}</div></div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--brand-dark)' }}>{VND(c.base)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
