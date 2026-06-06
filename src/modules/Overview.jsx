import { AdIc } from '../components/icons.jsx';
import { PageHead, Panel, AdBtn } from '../components/primitives.jsx';
import { A_KPI_REV } from '../data/mockData.js';
import { downloadCSV } from '../utils/csv.js';
import { useData } from '../store.jsx';

function OKpi({ k, v, sub, up }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 7 }}>{k}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: up ? 'var(--ok-dark)' : 'var(--muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>{up && AdIc.up(13)}{sub}</div>
    </div>
  );
}

export default function MOverview() {
  const { notify } = useData();
  const max = Math.max(...A_KPI_REV.map((d) => d.v));
  const exportReport = () => {
    downloadCSV('dichung-doanh-thu-7-ngay.csv', ['Ngày', 'Doanh thu (triệu đồng)'], A_KPI_REV.map((d) => [d.d, d.v]));
    notify('Đã xuất báo cáo doanh thu (CSV)');
  };
  const acts = [
    ['Tài xế mới đăng ký', 'Anh Bình · chờ duyệt KYC', '8 phút trước', 'amber'],
    ['Chuyến hoàn thành', 'TK→ĐN 07:00 · 4 khách · +480.000đ', '15 phút trước', 'green'],
    ['Khiếu nại mới', 'C1042 · Tài xế đến trễ', '22 phút trước', 'red'],
    ['Rút tiền', 'Anh Hùng · 1.683.000đ', '1 giờ trước', 'blue'],
    ['Khuyến mãi đạt giới hạn', 'GIAM20K · 988/1000', '2 giờ trước', 'gray'],
  ];
  return (
    <div>
      <PageHead title="Tổng quan" sub="Toàn cảnh hoạt động ĐiChung · cập nhật hôm nay" action={<AdBtn tone="light" sm onClick={exportReport}>Xuất báo cáo</AdBtn>} />
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <OKpi k="Doanh thu tuần" v="91,4 tr" sub="+8% so với tuần trước" up />
        <OKpi k="Chuyến hoàn thành" v="577" sub="+12% so với tuần trước" up />
        <OKpi k="Tài xế hoạt động" v="42" sub="2 chờ duyệt" />
        <OKpi k="Khách mới" v="318" sub="+19% so với tuần trước" up />
      </div>
      <div className="split" style={{ '--cols': '1.5fr 1fr' }}>
        <Panel title="Doanh thu 7 ngày" sub="Triệu đồng / ngày">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 190 }}>
            {A_KPI_REV.map((d, i) => (
              <div key={d.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>{d.v}</div>
                <div style={{ width: '100%', height: `${(d.v / max) * 100}%`, background: i === 5 ? 'linear-gradient(180deg,var(--brand),var(--brand-cyan))' : 'var(--brand-soft)', borderRadius: 8, minHeight: 8, transition: 'height .5s' }} />
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{d.d}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Hoạt động gần đây">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {acts.map(([t, s, time, tone]) => (
              <div key={t} style={{ display: 'flex', gap: 11, padding: '9px 4px', alignItems: 'flex-start' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: { amber: 'var(--amber)', green: 'var(--ok)', red: '#dc2626', blue: '#2563eb', gray: '#94a3b8' }[tone] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{time}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
