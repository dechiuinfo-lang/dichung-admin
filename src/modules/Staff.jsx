import { useState } from 'react';
import { PageHead, Panel, AdBtn, Badge } from '../components/primitives.jsx';
import { Modal, Field, Select } from '../components/Modal.jsx';
import { AdIc } from '../components/icons.jsx';
import { A_ROLES } from '../data/mockData.js';
import { useData } from '../store.jsx';
import { useAuth } from '../lib/auth.jsx';
import { getInitial } from '../utils/initials.js';

const ROLE_OPTS = [
  { value: 'Chủ / Quản trị', label: 'Chủ / Quản trị' },
  { value: 'Kế toán', label: 'Kế toán' },
  { value: 'CSKH', label: 'CSKH' },
  { value: 'Điều phối', label: 'Điều phối' },
];

function InviteModal({ onClose, onAdd, exists }) {
  const [f, setF] = useState({ name: '', email: '', role: 'CSKH' });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const email = f.email.trim().toLowerCase();
  const dup = exists(email);
  const valid = f.name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !dup;
  return (
    <Modal
      title="Mời nhân viên"
      sub="Gửi lời mời truy cập Admin Console"
      onClose={onClose}
      footer={<AdBtn sm tone="brand" disabled={!valid} onClick={() => { onAdd({ name: f.name.trim(), email, role: f.role, perms: [f.role] }); onClose(); }}>Gửi lời mời</AdBtn>}
    >
      <Field label="Họ tên" value={f.name} onChange={set('name')} placeholder="Nguyễn …" autoFocus />
      <Field label="Email" value={f.email} onChange={set('email')} placeholder="ten@dichung.vn" />
      {dup && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: -6 }}>Email đã tồn tại.</div>}
      <Select label="Vai trò" value={f.role} onChange={set('role')} options={ROLE_OPTS} />
    </Modal>
  );
}

export default function MStaff() {
  const { staff, toggleStaff, addStaff, notify } = useData();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [inviting, setInviting] = useState(false);
  return (
    <div>
      <PageHead title="Người dùng & Phân quyền" sub="Quản lý nhân viên và vai trò truy cập" action={isAdmin ? <AdBtn sm onClick={() => setInviting(true)}>+ Mời nhân viên</AdBtn> : null} />
      <div className="split" style={{ '--cols': '1.6fr 1fr' }}>
        <Panel title="Nhân viên" pad={10}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {staff.map((s, i) => (
              <div key={s.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 9, background: i % 2 ? 'transparent' : 'var(--bg)' }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand-dark)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{getInitial(s.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 200, justifyContent: 'flex-end' }}>
                  {s.perms.map((p) => <Badge key={p} tone="teal">{p}</Badge>)}
                </div>
                <div style={{ width: 110, textAlign: 'right' }}><Badge tone="gray">{s.role}</Badge></div>
                <button role="switch" aria-checked={s.active} aria-label={s.active ? 'Vô hiệu hóa' : 'Kích hoạt'} onClick={() => { toggleStaff(s.email); notify(`${s.active ? 'Đã vô hiệu hóa' : 'Đã kích hoạt'} ${s.name}`); }} style={{ position: 'relative', width: 40, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', background: s.active ? 'var(--brand)' : 'var(--line)', flexShrink: 0 }}><span style={{ position: 'absolute', top: 2.5, left: s.active ? 19 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} /></button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vai trò" sub="Nhóm quyền truy cập">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {A_ROLES.map((r) => (
              <div key={r.role} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: 'var(--brand)' }}>{AdIc.shield(17)}</span>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{r.role}</span>
                  <Badge tone="gray">{r.count} người</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {inviting && <InviteModal onClose={() => setInviting(false)} exists={(e) => staff.some((s) => s.email.toLowerCase() === e)} onAdd={(s) => { addStaff(s); notify(`Đã mời ${s.name}`); }} />}
    </div>
  );
}
