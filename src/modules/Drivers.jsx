import { useState } from 'react';
import { PageHead, Panel, AdBtn, Badge, Table, TRow } from '../components/primitives.jsx';
import { Modal, Field } from '../components/Modal.jsx';
import { useData } from '../store.jsx';
import { getInitial } from '../utils/initials.js';

function AddDriverModal({ onClose, onAdd }) {
  const [f, setF] = useState({ name: '', phone: '', model: '', plate: '', seats: '7' });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && /^[0-9 ]{9,13}$/.test(f.phone.trim()) && f.model.trim() && f.plate.trim();
  return (
    <Modal
      title="Thêm tài xế"
      sub="Tài xế mới sẽ ở trạng thái chờ duyệt KYC"
      onClose={onClose}
      footer={<AdBtn sm tone="brand" disabled={!valid} onClick={() => { onAdd({ ...f, seats: +f.seats || 7 }); onClose(); }}>Thêm tài xế</AdBtn>}
    >
      <Field label="Họ tên" value={f.name} onChange={set('name')} placeholder="Anh / Chị …" autoFocus />
      <Field label="Số điện thoại" value={f.phone} onChange={set('phone')} placeholder="0905 …" />
      <Field label="Mẫu xe" value={f.model} onChange={set('model')} placeholder="Toyota Innova" />
      <Field label="Biển số" value={f.plate} onChange={set('plate')} placeholder="92A-123.45" />
      <Field label="Số chỗ" type="number" value={f.seats} onChange={set('seats')} />
    </Modal>
  );
}

export default function MDrivers({ query = '' }) {
  const { drivers, setDriver, addDriver, notify } = useData();
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = drivers.filter((d) => (filter === 'all' || d.status === filter)
    && (!q || d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.model.toLowerCase().includes(q) || d.plate.toLowerCase().includes(q)));
  const cols = [{ t: 'Tài xế', w: '1.6fr' }, { t: 'Xe', w: '1.4fr' }, { t: 'Đánh giá', w: '.9fr', align: 'right' }, { t: 'Chuyến', w: '.8fr', align: 'right' }, { t: 'KYC', w: '1fr', align: 'center' }, { t: 'Trạng thái', w: '1fr', align: 'center' }, { t: '', w: '1.4fr', align: 'right' }];
  const tabs = [['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['active', 'Hoạt động'], ['suspended', 'Tạm khóa']];
  return (
    <div>
      <PageHead title="Quản lý tài xế" sub={`${drivers.length} tài xế · ${drivers.filter((d) => d.status === 'pending').length} chờ duyệt`} action={<AdBtn sm onClick={() => setAdding(true)}>+ Thêm tài xế</AdBtn>} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => {
          const n = k === 'all' ? drivers.length : drivers.filter((d) => d.status === k).length;
          const on = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{ border: on ? '1.5px solid var(--brand)' : '1px solid var(--line)', borderRadius: 99, padding: '8px 15px', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: on ? 'var(--brand-soft)' : 'var(--card)', color: on ? 'var(--brand-dark)' : 'var(--muted)' }}>{l} · {n}</button>
          );
        })}
      </div>
      <Panel pad={10}>
        <Table cols={cols}>
          {shown.map((d, i) => (
            <TRow key={d.id} cols={cols} i={i} cells={[
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand-dark)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{getInitial(d.name)}</span><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{d.name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d.phone}</div></div></div>,
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.model}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{d.plate} · {d.seats} chỗ</div></div>,
              <span style={{ fontWeight: 700 }}>{d.rating ? '★ ' + d.rating : '—'}</span>,
              <span>{d.trips.toLocaleString('vi-VN')}</span>,
              <div style={{ textAlign: 'center' }}>{d.kyc === 'verified' ? <Badge tone="green">Đã xác minh</Badge> : <Badge tone="amber">Chờ duyệt</Badge>}</div>,
              <div style={{ textAlign: 'center' }}>{d.status === 'active' ? <Badge tone="teal">Hoạt động</Badge> : d.status === 'pending' ? <Badge tone="amber">Chờ duyệt</Badge> : <Badge tone="red">Tạm khóa</Badge>}</div>,
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {d.status === 'pending' && <AdBtn sm tone="ok" onClick={() => { setDriver(d.id, { status: 'active', kyc: 'verified' }); notify(`Đã duyệt ${d.name}`); }}>Duyệt</AdBtn>}
                {d.status === 'active' && <AdBtn sm tone="light" onClick={() => { setDriver(d.id, { status: 'suspended' }); notify(`Đã khóa ${d.name}`); }}>Khóa</AdBtn>}
                {d.status === 'suspended' && <AdBtn sm tone="light" onClick={() => { setDriver(d.id, { status: 'active' }); notify(`Đã mở khóa ${d.name}`); }}>Mở khóa</AdBtn>}
              </div>,
            ]} />
          ))}
          {shown.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Không có tài xế phù hợp.</div>}
        </Table>
      </Panel>
      {adding && <AddDriverModal onClose={() => setAdding(false)} onAdd={(d) => { addDriver(d); notify(`Đã thêm tài xế ${d.name}`); }} />}
    </div>
  );
}
