import { PageHead, Panel, AdBtn, Badge, Table, TRow } from '../components/primitives.jsx';
import { AdIc } from '../components/icons.jsx';
import { VND } from '../utils/format.js';
import { downloadCSV } from '../utils/csv.js';
import { useData } from '../store.jsx';

function FStat({ k, v, tone }) {
  const c = { ink: 'var(--ink)', brand: 'var(--brand-dark)', amber: 'var(--amber-dark)', blue: '#1d4ed8' }[tone];
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '15px 16px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 7 }}>{k}</div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, color: c }}>{v}</div>
    </div>
  );
}

export default function MFinance() {
  const { payouts, payPayout, notify } = useData();
  const pendingTotal = payouts.filter((p) => p.status === 'pending').reduce((n, p) => n + p.net, 0);
  const cols = [{ t: 'Tài xế', w: '1.4fr' }, { t: 'Chuyến', w: '.7fr', align: 'right' }, { t: 'Doanh thu', w: '1fr', align: 'right' }, { t: 'Hoa hồng 15%', w: '1fr', align: 'right' }, { t: 'Thực trả', w: '1fr', align: 'right' }, { t: 'Trạng thái', w: '.9fr', align: 'center' }, { t: '', w: '.9fr', align: 'right' }];
  const exportExcel = () => {
    downloadCSV(
      'dichung-doi-soat-tai-xe.csv',
      ['Tài xế', 'Chuyến', 'Doanh thu', 'Hoa hồng 15%', 'Thực trả', 'Trạng thái'],
      payouts.map((p) => [p.driver, p.trips, p.gross, p.commission, p.net, p.status === 'paid' ? 'Đã trả' : 'Chờ trả']),
    );
    notify('Đã xuất đối soát (CSV/Excel)');
  };
  return (
    <div>
      <PageHead title="Đối soát tài chính" sub="Doanh thu, hoa hồng, thanh toán tài xế & COD" action={<AdBtn tone="light" sm onClick={exportExcel}>Xuất Excel</AdBtn>} />
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <FStat k="Tổng doanh thu (tuần)" v={VND(70300000)} tone="ink" />
        <FStat k="Hoa hồng nền tảng" v={VND(10545000)} tone="brand" />
        <FStat k="Chờ chi trả tài xế" v={VND(pendingTotal)} tone="amber" />
        <FStat k="COD đang giữ" v={VND(3200000)} tone="blue" />
      </div>
      <Panel title="Thanh toán tài xế kỳ này" sub="Đối soát theo tuần · trừ 15% hoa hồng" pad={10}>
        <Table cols={cols}>
          {payouts.map((p, i) => (
            <TRow key={p.id} cols={cols} i={i} cells={[
              <span style={{ fontWeight: 700 }}>{p.driver}</span>,
              <span>{p.trips}</span>,
              <span>{VND(p.gross)}</span>,
              <span style={{ color: 'var(--muted)' }}>− {VND(p.commission)}</span>,
              <span style={{ fontWeight: 800, color: 'var(--brand-dark)' }}>{VND(p.net)}</span>,
              <div style={{ textAlign: 'center' }}>{p.status === 'paid' ? <Badge tone="green">Đã trả</Badge> : <Badge tone="amber">Chờ trả</Badge>}</div>,
              <div style={{ textAlign: 'right' }}>{p.status === 'pending' ? <AdBtn sm tone="ok" onClick={() => { payPayout(p.id); notify(`Đã chi trả ${p.driver} · ${VND(p.net)}`); }}>Chi trả</AdBtn> : <span style={{ color: 'var(--ok-dark)' }}>{AdIc.check(16)}</span>}</div>,
            ]} />
          ))}
        </Table>
      </Panel>
    </div>
  );
}
