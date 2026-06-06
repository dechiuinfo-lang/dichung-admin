import { useState } from 'react';
import { useData } from '../store.jsx';
import { VND } from '../utils/format.js';
import Pill from '../components/Pill.jsx';
import FleetMap from './FleetMap.jsx';
import { useDispatchBoard } from '../data/useDispatchBoard.js';
import { seatsUsed, DIRSHORT } from '../data/dispatchBoard.js';

function Kpi({ k, v, tone, small, hot }) {
  const colors = { amber: 'var(--amber)', tk: 'var(--brand)', run: '#2563eb', ok: 'var(--ok)', ink: 'var(--ink)' };
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow)', transition: 'transform .2s', transform: hot && tone === 'amber' ? 'scale(1.03)' : 'scale(1)' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{k}</div>
      <div style={{ fontSize: small ? 19 : 30, fontWeight: 800, letterSpacing: -0.5, color: colors[tone], lineHeight: 1 }}>{v}</div>
    </div>
  );
}

function Col({ title, children, hot }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}{hot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function TripCard({ t, onDepart, onDone }) {
  const used = seatsUsed(t);
  const pct = Math.round((used / Math.max(1, t.seats_cap)) * 100);
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Pill tone={t.direction === 'tk-dn' ? 'tk' : 'dn'}>{DIRSHORT[t.direction] || t.direction}</Pill>
        {t.slot && <b style={{ fontSize: 15 }}>{t.slot}</b>}
        {t.onDemand && <Pill tone="ok">⚡ Đi ngay</Pill>}
        <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.driver?.name} · {t.driver?.plate}</span>
        <Pill tone={t.status === 'enroute' ? 'run' : 'dn'} style={{ marginLeft: 'auto' }}>{t.status === 'enroute' ? 'Đang chạy' : 'Đang gom'}</Pill>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ fontWeight: 700 }}>{used}/{t.seats_cap} chỗ</span>
        <span style={{ color: 'var(--muted)' }}>{t.service_type === 'bao' ? 'Bao xe' : 'Xe ghép'}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--chip)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: pct + '%', height: '100%', background: t.status === 'enroute' ? '#2563eb' : 'linear-gradient(90deg,var(--brand),var(--brand-cyan))', borderRadius: 99, transition: 'width .5s' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {t.bookings.map((b) => (
          <span key={b.id} style={{ fontSize: 11.5, fontWeight: 600, background: 'var(--chip)', borderRadius: 8, padding: '4px 8px', color: 'var(--ink)' }}>
            <b>{b.order}</b> {b.name}{b.pax > 1 ? '×' + b.pax : ''} <span style={{ color: 'var(--muted)' }}>· {b.pickup}</span>
          </span>
        ))}
      </div>
      {t.status === 'forming'
        ? <BtnD onClick={() => onDepart(t.id)} label="Khởi hành" tone="brand" />
        : <BtnD onClick={() => onDone(t.id)} label="Hoàn thành" tone="ok" />}
    </div>
  );
}

function PendingCard({ p }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <Pill tone={p.direction === 'tk-dn' ? 'tk' : 'dn'}>{DIRSHORT[p.direction] || p.direction}</Pill>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>{p.name}{p.pax > 1 ? ` · ${p.pax} khách` : ''}{p.onDemand && <Pill tone="ok">⚡ Đi ngay</Pill>}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.service_type === 'bao' ? 'Bao xe' : 'Ghép'} · đón {p.pickup}</div>
      </div>
    </div>
  );
}

function DriverRow({ d, onAppr }) {
  const stMap = { idle: ['Đang rảnh', 'mut'], forming: ['Đang gom', 'dn'], enroute: ['Đang chạy', 'run'], offline: ['Nghỉ', 'mut'] };
  const [lbl, tone] = stMap[d.status] || ['—', 'mut'];
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand-dark)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{d.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.model} · {d.plate}</div>
      </div>
      {d.approved ? <Pill tone={tone}>{lbl}</Pill>
        : <button onClick={() => onAppr(d.id)} style={{ border: 'none', borderRadius: 9, padding: '7px 12px', background: 'var(--amber)', color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>Duyệt</button>}
    </div>
  );
}

function BtnD({ onClick, label, tone }) {
  return <button onClick={onClick} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '9px', background: tone === 'ok' ? 'var(--ok)' : 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{label}</button>;
}

function Empty({ text }) {
  return <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: 12 }}>{text}</div>;
}

function ViewTabs({ view, setView }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--chip)', borderRadius: 11, padding: 4 }}>
      {[['board', 'Điều phối'], ['fleet', 'Bản đồ đội xe']].map(([k, l]) => {
        const on = view === k;
        return <button key={k} onClick={() => setView(k)} style={{ border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--brand-dark)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>{l}</button>;
      })}
    </div>
  );
}

export default function MDispatch() {
  const { notify } = useData();
  const { board, pulse, onMatch, onNow, onDepart, onDone, onAppr, live } = useDispatchBoard();
  const [matched, setMatched] = useState(false);
  const [view, setView] = useState('board');

  const handleMatch = () => {
    onMatch();
    setMatched(true);
    setTimeout(() => setMatched(false), 1400);
  };
  const handleNow = () => {
    onNow();
    notify(live ? 'Đã tạo yêu cầu “đi ngay” — engine đang ghép' : 'Khách “đi ngay” — đang điều xe gần nhất');
  };
  const s = board.stats;

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.4 }}>Điều phối</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>Ghép khách vào chuyến · Tam Kỳ ⇄ Đà Nẵng · Hội An – ĐN – Huế</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <ViewTabs view={view} setView={setView} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pulse ? 'var(--amber)' : 'var(--ok)', transition: 'background .3s', boxShadow: '0 0 0 4px color-mix(in oklab,var(--ok) 18%,transparent)' }} />
            Cập nhật realtime
          </span>
          {view === 'board' && (
            <>
              <button onClick={handleNow} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '11px 16px', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                + Khách đi ngay
              </button>
              <button onClick={handleMatch} style={{ border: 'none', borderRadius: 12, padding: '11px 20px', background: matched ? 'var(--ok)' : 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 8px 18px -6px var(--brand)', transition: 'background .2s' }}>
                {matched ? '✓ Đã ghép' : '⚡ Ghép ngay'}
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'fleet' ? <FleetMap /> : (
        <>
          {/* KPIs */}
          <div className="dispatch-kpis" style={{ marginBottom: 18 }}>
            <Kpi k="Khách chờ ghép" v={s.pending} tone="amber" hot={pulse} />
            <Kpi k="Đang gom" v={s.forming} tone="tk" />
            <Kpi k="Đang chạy" v={s.enroute} tone="run" />
            <Kpi k="Hoàn thành hôm nay" v={s.completed} tone="ok" />
            <Kpi k="Doanh thu" v={VND(s.revenue)} tone="ink" small />
          </div>

          {/* 3 columns */}
          <div className="dispatch-cols">
            <Col title={`Chuyến đang gom / đang chạy (${board.trips.length})`}>
              {board.trips.length ? board.trips.map((t) => (
                <TripCard key={t.id} t={t} onDepart={onDepart} onDone={onDone} />
              )) : <Empty text="Chưa có chuyến nào." />}
            </Col>
            <Col title={`Khách đang chờ ghép (${board.pending.length})`} hot={pulse}>
              {board.pending.length ? board.pending.map((p) => <PendingCard key={p.id} p={p} />) : <Empty text="Không có khách chờ." />}
            </Col>
            <Col title="Đội xe">
              {board.drivers.map((d) => <DriverRow key={d.id} d={d} onAppr={onAppr} />)}
            </Col>
          </div>
        </>
      )}
    </div>
  );
}
