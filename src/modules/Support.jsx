import { useState } from 'react';
import { PageHead, Panel, AdBtn, Badge, Table, TRow } from '../components/primitives.jsx';
import { AdIc } from '../components/icons.jsx';
import { useData } from '../store.jsx';

const stLabel = { open: 'Mới', progress: 'Đang xử lý', closed: 'Đã đóng' };

export default function MSupport({ query = '' }) {
  const { tickets, advanceTicket, notify } = useData();
  const [filter, setFilter] = useState('all');
  const priTone = { cao: 'red', trung: 'amber', thấp: 'gray' };
  const stTone = { open: 'red', progress: 'amber', closed: 'green' };
  const q = query.trim().toLowerCase();
  const shown = tickets.filter((t) => (filter === 'all' || t.status === filter || (filter === 'openish' && t.status !== 'closed'))
    && (!q || t.id.toLowerCase().includes(q) || t.user.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)));
  const cols = [{ t: 'Mã', w: '.7fr' }, { t: 'Khách', w: '1.2fr' }, { t: 'Vấn đề', w: '1.6fr' }, { t: 'Chuyến', w: '1.1fr' }, { t: 'Ưu tiên', w: '.8fr', align: 'center' }, { t: 'Trạng thái', w: '1fr', align: 'center' }, { t: '', w: '1.1fr', align: 'right' }];
  const openN = tickets.filter((t) => t.status !== 'closed').length;
  const tabs = [['all', 'Tất cả'], ['openish', 'Đang mở'], ['open', 'Mới'], ['progress', 'Đang xử lý'], ['closed', 'Đã đóng']];
  return (
    <div>
      <PageHead title="Khiếu nại & Hỗ trợ" sub={`${openN} ticket đang mở`} action={null} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => {
          const on = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{ border: on ? '1.5px solid var(--brand)' : '1px solid var(--line)', borderRadius: 99, padding: '8px 15px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: on ? 'var(--brand-soft)' : 'var(--card)', color: on ? 'var(--brand-dark)' : 'var(--muted)' }}>{l}</button>
          );
        })}
      </div>
      <Panel pad={10}>
        <Table cols={cols}>
          {shown.map((t, i) => (
            <TRow key={t.id} cols={cols} i={i} cells={[
              <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: 12.5 }}>{t.id}</span>,
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t.user}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.time}</div></div>,
              <span style={{ fontWeight: 600 }}>{t.type}</span>,
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{t.trip}</span>,
              <div style={{ textAlign: 'center' }}><Badge tone={priTone[t.pri]}>{t.pri}</Badge></div>,
              <div style={{ textAlign: 'center' }}><Badge tone={stTone[t.status]}>{stLabel[t.status]}</Badge></div>,
              <div style={{ textAlign: 'right' }}>{t.status !== 'closed' ? <AdBtn sm tone={t.status === 'open' ? 'brand' : 'ok'} onClick={() => { advanceTicket(t.id); notify(t.status === 'open' ? `Đã tiếp nhận ${t.id}` : `Đã đóng ${t.id}`); }}>{t.status === 'open' ? 'Tiếp nhận' : 'Đóng'}</AdBtn> : <span style={{ color: 'var(--ok-dark)' }}>{AdIc.check(16)}</span>}</div>,
            ]} />
          ))}
          {shown.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Không có ticket phù hợp.</div>}
        </Table>
      </Panel>
    </div>
  );
}
