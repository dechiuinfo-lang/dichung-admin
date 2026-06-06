import { useState } from 'react';
import Mark from './components/Mark.jsx';
import { AdIc } from './components/icons.jsx';
import { Toast } from './components/Modal.jsx';
import { useData } from './store.jsx';
import { useAuth } from './lib/auth.jsx';
import { getInitial } from './utils/initials.js';
import MOverview from './modules/Overview.jsx';
import MDispatch from './modules/Dispatch.jsx';
import MDrivers from './modules/Drivers.jsx';
import MPricing from './modules/Pricing.jsx';
import MPromos from './modules/Promos.jsx';
import MFinance from './modules/Finance.jsx';
import MSupport from './modules/Support.jsx';
import MStaff from './modules/Staff.jsx';

const ROLE_LABEL = { admin: 'Quản trị', accountant: 'Kế toán', cskh: 'CSKH', dispatch: 'Điều phối' };

const NAV = [
  ['overview', 'Tổng quan', AdIc.grid],
  ['dispatch', 'Điều phối', AdIc.dispatch],
  ['drivers', 'Tài xế', AdIc.users],
  ['pricing', 'Bảng giá & Tuyến', AdIc.route],
  ['promos', 'Khuyến mãi', AdIc.tag],
  ['finance', 'Đối soát tài chính', AdIc.wallet],
  ['support', 'Khiếu nại', AdIc.chat],
  ['staff', 'Phân quyền', AdIc.shield],
];

// Which roles may see each module (mirrors the RLS write permissions). Mock mode is admin.
const ROLE_MODULES = {
  overview: ['admin', 'accountant', 'dispatch', 'cskh'],
  dispatch: ['admin', 'dispatch'],
  drivers: ['admin', 'dispatch'],
  pricing: ['admin'],
  promos: ['admin'],
  finance: ['admin', 'accountant'],
  support: ['admin', 'cskh'],
  staff: ['admin'],
};

const VIEWS = {
  overview: MOverview,
  dispatch: MDispatch,
  drivers: MDrivers,
  pricing: MPricing,
  promos: MPromos,
  finance: MFinance,
  support: MSupport,
  staff: MStaff,
};

// Modules whose tables react to the topbar search query.
const SEARCHABLE = new Set(['drivers', 'promos', 'support']);

export default function AdminApp() {
  const [page, setPage] = useState('overview');
  const { query, setQuery, toast, loading, queryError, realtime } = useData();
  const { mode, profile, role, signOut } = useAuth();
  const effRole = role || 'admin';
  const nav = NAV.filter(([k]) => ROLE_MODULES[k].includes(effRole));
  const allowed = nav.map(([k]) => k);
  const current = allowed.includes(page) ? page : (allowed[0] || 'overview');
  const View = VIEWS[current] || MOverview;
  const name = profile?.full_name || 'Trần Quản Lý';
  const roleLabel = ROLE_LABEL[role] || 'Quản trị';
  const initial = getInitial(name);

  return (
    <div style={{ height: '100%', display: 'flex', background: 'var(--bg)', color: 'var(--ink)', fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div className="sidebar" style={{ flexShrink: 0, background: 'var(--card)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', padding: '18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px' }}>
          <Mark size={30} />
          <div className="collapse-text">
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>ĐiChung</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Admin Console</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {nav.map(([k, l, ic]) => {
            const on = current === k;
            return (
              /* NOTE: backgroundColor swaps between transparent and var() with NO
                 transition — transitioning transparent ↔ var() freezes the paint. */
              <button key={k} className="nav-btn" title={l} aria-current={on ? 'page' : undefined} onClick={() => setPage(k)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, textAlign: 'left', backgroundColor: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--muted)' }}>
                <span style={{ display: 'flex', opacity: on ? 1 : 0.8 }}>{ic(19)}</span><span className="collapse-text">{l}</span>
              </button>
            );
          })}
        </div>
        {/* account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderTop: '1px solid var(--line)', marginTop: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand-dark)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{initial}</span>
          <div className="collapse-text" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{roleLabel}</div>
          </div>
          {mode === 'supabase' && (
            <button className="collapse-text" onClick={signOut} title="Đăng xuất" aria-label="Đăng xuất" style={{ border: '1px solid var(--line)', background: 'var(--card)', borderRadius: 9, padding: '6px 8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', borderBottom: '1px solid var(--line)', background: 'var(--card)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 13px', width: 280, maxWidth: '40vw', color: 'var(--muted)' }}>
            {AdIc.search(16)}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={SEARCHABLE.has(page) ? 'Tìm trong danh sách…' : 'Tìm tài xế, mã KM, khiếu nại…'}
              style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--ink)' }}
            />
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ position: 'relative', color: 'var(--muted)', display: 'flex' }}>{AdIc.bell(20)}<span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#dc2626', border: '1.5px solid var(--card)' }} /></span>
            {(() => {
              // Honest status: live realtime only when actually subscribed; mock = sample data.
              const [dot, label] = mode !== 'supabase'
                ? ['#94a3b8', 'Dữ liệu mẫu']
                : realtime ? ['var(--ok)', 'Realtime'] : ['var(--amber)', 'Đang kết nối…'];
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 0 4px color-mix(in oklab,${dot} 18%,transparent)` }} /> {label}
                </span>
              );
            })()}
          </div>
        </div>
        {/* content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {queryError && (
            <div style={{ marginBottom: 16, padding: '11px 14px', borderRadius: 12, background: '#fee2e2', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
              Không tải được dữ liệu: {queryError.message}
            </div>
          )}
          {loading && !queryError && (
            <div style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>Đang tải dữ liệu…</div>
          )}
          <View query={SEARCHABLE.has(current) ? query : ''} />
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
