import { useState } from 'react';
import { PageHead, Panel, AdBtn, Badge, Table, TRow } from '../components/primitives.jsx';
import { Modal, Field } from '../components/Modal.jsx';
import { useData } from '../store.jsx';

function AddPromoModal({ onClose, onAdd, exists }) {
  const [f, setF] = useState({ code: '', type: '', cap: '', limit: '', exp: '' });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const code = f.code.trim().toUpperCase();
  const dup = exists(code);
  const valid = code && f.type.trim() && !dup;
  return (
    <Modal
      title="Tạo mã khuyến mãi"
      sub="Mã mới sẽ được bật sẵn"
      onClose={onClose}
      footer={<AdBtn sm tone="brand" disabled={!valid} onClick={() => { onAdd({ code, type: f.type.trim(), cap: f.cap.trim() || '—', limit: f.limit.trim() || '∞', exp: f.exp.trim() || '—', active: true }); onClose(); }}>Tạo mã</AdBtn>}
    >
      <Field label="Mã (in hoa)" value={f.code} onChange={set('code')} placeholder="DICHUNG10" autoFocus />
      {dup && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: -6 }}>Mã đã tồn tại.</div>}
      <Field label="Ưu đãi (vd: 10% hoặc 20.000đ)" value={f.type} onChange={set('type')} placeholder="10%" />
      <Field label="Giảm tối đa" value={f.cap} onChange={set('cap')} placeholder="30k" />
      <Field label="Giới hạn lượt" value={f.limit} onChange={set('limit')} placeholder="1000" />
      <Field label="Hết hạn" value={f.exp} onChange={set('exp')} placeholder="30/06" />
    </Modal>
  );
}

export default function MPromos({ query = '' }) {
  const { promos, togglePromo, addPromo, notify } = useData();
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = promos.filter((p) => !q || p.code.toLowerCase().includes(q));
  const cols = [{ t: 'Mã', w: '1.2fr' }, { t: 'Ưu đãi', w: '1fr' }, { t: 'Tối đa', w: '.7fr', align: 'right' }, { t: 'Đã dùng', w: '1.3fr' }, { t: 'Hết hạn', w: '.8fr', align: 'center' }, { t: 'Trạng thái', w: '1fr', align: 'center' }, { t: '', w: '.8fr', align: 'right' }];
  return (
    <div>
      <PageHead title="Khuyến mãi" sub={`${promos.filter((p) => p.active).length} mã đang chạy`} action={<AdBtn sm onClick={() => setAdding(true)}>+ Tạo mã mới</AdBtn>} />
      <Panel pad={10}>
        <Table cols={cols}>
          {shown.map((p, i) => {
            const pct = p.limit === '∞' ? 30 : Math.round((p.used / Number(p.limit)) * 100);
            return (
              <TRow key={p.code} cols={cols} i={i} cells={[
                <span style={{ fontWeight: 800, letterSpacing: 0.5, fontFamily: 'monospace', fontSize: 13 }}>{p.code}</span>,
                <span style={{ fontWeight: 700, color: 'var(--brand-dark)' }}>Giảm {p.type}</span>,
                <span style={{ color: 'var(--muted)' }}>{p.cap}</span>,
                <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}><span>{p.used.toLocaleString('vi-VN')}</span><span style={{ color: 'var(--muted)' }}>/ {p.limit}</span></div><div style={{ height: 5, borderRadius: 99, background: 'var(--chip)', overflow: 'hidden' }}><div style={{ width: Math.min(100, pct) + '%', height: '100%', background: pct >= 95 ? 'var(--amber)' : 'var(--brand)', borderRadius: 99 }} /></div></div>,
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>{p.exp}</div>,
                <div style={{ textAlign: 'center' }}>{p.active ? <Badge tone="green">Đang chạy</Badge> : <Badge tone="gray">Tắt</Badge>}</div>,
                <div style={{ textAlign: 'right' }}><button role="switch" aria-checked={p.active} aria-label={p.active ? 'Tắt mã' : 'Bật mã'} onClick={() => togglePromo(p.code)} style={{ position: 'relative', width: 40, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', background: p.active ? 'var(--brand)' : 'var(--line)' }}><span style={{ position: 'absolute', top: 2.5, left: p.active ? 19 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></button></div>,
              ]} />
            );
          })}
          {shown.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Không tìm thấy mã.</div>}
        </Table>
      </Panel>
      {adding && <AddPromoModal onClose={() => setAdding(false)} exists={(c) => promos.some((p) => p.code === c)} onAdd={(p) => { addPromo(p); notify(`Đã tạo mã ${p.code}`); }} />}
    </div>
  );
}
