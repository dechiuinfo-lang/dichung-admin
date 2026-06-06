import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import Pill from '../components/Pill.jsx';
import { AdIc } from '../components/icons.jsx';
import { DIRSHORT } from '../data/dispatchBoard.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

// Real free stack: MapLibre GL + OpenFreeMap tiles (no API key, no limits) + the W3C
// Geolocation API for REAL device GPS (the actual GPS source in a ride app: the driver's
// phone). Supabase Realtime "broadcast" shares positions device→dispatch — open this on a
// phone, tap "Vị trí của tôi", and the dot appears live on every other open map.
const STYLE = 'https://tiles.openfreemap.org/styles/bright';

// Real coordinates of the corridor cities.
const CITY = {
  hue: { name: 'Huế', lng: 107.5909, lat: 16.4637 },
  dn: { name: 'Đà Nẵng', lng: 108.2022, lat: 16.0544 },
  ha: { name: 'Hội An', lng: 108.3380, lat: 15.8801 },
  tk: { name: 'Tam Kỳ', lng: 108.4740, lat: 15.5736 },
};
const LEGS = { 'tk-dn': ['tk', 'dn'], 'dn-ha': ['dn', 'ha'], 'dn-hue': ['dn', 'hue'] };
function legOf(dir) {
  const [a, b] = dir.split('-');
  return LEGS[`${a}-${b}`] ? { pts: LEGS[`${a}-${b}`], fwd: true } : { pts: LEGS[`${b}-${a}`], fwd: false };
}
function posOf(v) {
  const { pts, fwd } = legOf(v.dir);
  const A = CITY[pts[0]]; const B = CITY[pts[1]];
  const t = fwd ? v.t : 1 - v.t;
  return { lng: A.lng + (B.lng - A.lng) * t, lat: A.lat + (B.lat - A.lat) * t };
}

function seedFleet() {
  return [
    { id: 'v1', plate: '92A-123.45', driver: 'Anh Tuấn', dir: 'tk-dn', t: 0.34, sp: 0.018, status: 'enroute', pax: 4, cap: 7 },
    { id: 'v2', plate: '43A-678.90', driver: 'Anh Hùng', dir: 'dn-tk', t: 0.62, sp: 0.015, status: 'enroute', pax: 3, cap: 4 },
    { id: 'v3', plate: '92B-456.78', driver: 'Chị Lan', dir: 'dn-hue', t: 0.18, sp: 0.012, status: 'enroute', pax: 6, cap: 9 },
    { id: 'v4', plate: '92A-901.23', driver: 'Anh Phát', dir: 'ha-dn', t: 0.78, sp: 0.02, status: 'enroute', pax: 5, cap: 7 },
    { id: 'v5', plate: '43A-222.11', driver: 'Anh Sơn', dir: 'hue-dn', t: 0.45, sp: 0.013, status: 'enroute', pax: 7, cap: 9 },
    { id: 'v6', plate: '92A-333.66', driver: 'Anh Kiên', dir: 'dn-ha', t: 0.05, sp: 0.022, status: 'forming', pax: 2, cap: 7 },
  ];
}

const carEl = (color) => {
  const d = document.createElement('div');
  d.style.cssText = `width:26px;height:26px;border-radius:50%;background:#fff;border:3px solid ${color};display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer`;
  d.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16l1.4-5a3 3 0 0 1 2.9-2.2h5.4a3 3 0 0 1 2.9 2.2L19 16"/><path d="M3 16h18v3H3z"/></svg>`;
  return d;
};
const meEl = () => {
  const d = document.createElement('div');
  d.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)';
  return d;
};

export default function FleetMap() {
  const containerRef = useRef(null);
  const ref = useRef({ map: null, gl: null, markers: {}, me: null, remote: {}, ch: null });
  const [fleet, setFleet] = useState(seedFleet);
  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [err, setErr] = useState('');

  // init map (lazy-import MapLibre so it's not in the initial bundle)
  useEffect(() => {
    let alive = true;
    (async () => {
      const gl = (await import('maplibre-gl')).default;
      if (!alive || !containerRef.current) return;
      const map = new gl.Map({ container: containerRef.current, style: STYLE, center: [108.15, 16.0], zoom: 8, attributionControl: true });
      map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
      ref.current.map = map; ref.current.gl = gl;
      map.on('load', () => {
        if (!alive) return;
        // corridor lines (real geometry)
        const features = Object.values(LEGS).map((p) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[CITY[p[0]].lng, CITY[p[0]].lat], [CITY[p[1]].lng, CITY[p[1]].lat]] } }));
        map.addSource('corridors', { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.addLayer({ id: 'corridors', type: 'line', source: 'corridors', paint: { 'line-color': '#0d9488', 'line-width': 3, 'line-dasharray': [2, 2] } });
        Object.values(CITY).forEach((c) => {
          const el = document.createElement('div');
          el.style.cssText = 'font:700 12px Be Vietnam Pro,sans-serif;color:#0f1b22;background:rgba(255,255,255,.85);padding:2px 7px;border-radius:8px;border:1px solid #e6ecf1;white-space:nowrap';
          el.textContent = c.name;
          new gl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
        });
        setReady(true);
      });
    })();
    return () => { alive = false; ref.current.map?.remove(); ref.current.map = null; };
  }, []);

  // animate the demo fleet along the real corridors + sync markers
  useEffect(() => {
    const iv = setInterval(() => {
      setFleet((fl) => fl.map((v) => {
        let nt = v.t + v.sp * 0.18; let dir = v.dir;
        if (nt >= 1) { nt = 0; const [a, b] = v.dir.split('-'); dir = `${b}-${a}`; }
        return { ...v, t: nt, dir };
      }));
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // render/refresh markers when fleet moves (and the map is ready)
  useEffect(() => {
    const { map, gl, markers } = ref.current;
    if (!ready || !map || !gl) return;
    fleet.forEach((v) => {
      const { lng, lat } = posOf(v);
      const color = v.status === 'forming' ? '#d97706' : '#2563eb';
      if (!markers[v.id]) markers[v.id] = new gl.Marker({ element: carEl(color) }).setLngLat([lng, lat]).addTo(map);
      else markers[v.id].setLngLat([lng, lat]);
    });
  }, [fleet, ready]);

  // Supabase Realtime: share/receive positions across devices (live mode)
  useEffect(() => {
    if (!isSupabaseConfigured || !ready) return undefined;
    const { map, gl, remote } = ref.current;
    const ch = supabase.channel('fleet', { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (!payload?.id) return;
      if (!remote[payload.id]) remote[payload.id] = new gl.Marker({ element: carEl('#16a34a') }).setLngLat([payload.lng, payload.lat]).addTo(map);
      else remote[payload.id].setLngLat([payload.lng, payload.lat]);
    });
    ch.subscribe();
    ref.current.ch = ch;
    return () => { supabase.removeChannel(ch); ref.current.ch = null; };
  }, [ready]);

  // REAL device GPS via the Geolocation API
  const watchRef = useRef(null);
  const toggleTrack = () => {
    const { map, gl } = ref.current;
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null;
      ref.current.me?.remove(); ref.current.me = null; setTracking(false); return;
    }
    if (!navigator.geolocation) { setErr('Trình duyệt không hỗ trợ định vị'); return; }
    setErr('');
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const lng = p.coords.longitude; const lat = p.coords.latitude;
        if (!ref.current.me) ref.current.me = new gl.Marker({ element: meEl() }).setLngLat([lng, lat]).addTo(map);
        else ref.current.me.setLngLat([lng, lat]);
        map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 12) });
        setTracking(true);
        ref.current.ch?.send({ type: 'broadcast', event: 'pos', payload: { id: 'me-' + (supabase?.realtime?.accessToken ? 'staff' : 'guest'), lng, lat, driver: 'Tôi' } });
      },
      () => setErr('Bạn cần cho phép quyền vị trí'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  };
  useEffect(() => () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const enroute = fleet.filter((v) => v.status === 'enroute').length;
  const totalPax = fleet.reduce((n, v) => n + v.pax, 0);

  return (
    <div className="fleet-grid">
      <div style={{ position: 'relative', height: 'min(62vh, 560px)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        {!ready && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontWeight: 600, background: 'var(--bg)' }}>Đang tải bản đồ…</div>}
        <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={toggleTrack} style={{ border: 'none', borderRadius: 10, padding: '9px 14px', background: tracking ? 'var(--ok)' : 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
            {tracking ? '● Đang theo dõi vị trí' : '📍 Vị trí của tôi (GPS thật)'}
          </button>
          {err && <span style={{ fontSize: 12, color: '#b91c1c', background: 'rgba(255,255,255,.9)', padding: '4px 8px', borderRadius: 8 }}>{err}</span>}
        </div>
        <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.92)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: 'var(--brand-dark)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 0 4px color-mix(in oklab,var(--ok) 18%,transparent)' }} /> {enroute} xe đang chạy · {totalPax} khách
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 }}>Đội xe đang hoạt động ({fleet.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fleet.map((v) => {
            const col = v.status === 'forming' ? 'var(--amber)' : '#2563eb';
            const pct = Math.round((v.pax / v.cap) * 100);
            return (
              <div key={v.id} onClick={() => { const p = posOf(v); ref.current.map?.easeTo({ center: [p.lng, p.lat], zoom: 11 }); }} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', boxShadow: 'var(--shadow)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: col, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{AdIc.car(17)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{v.driver}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{v.plate}</div>
                  </div>
                  <Pill tone={v.dir.split('-')[0] === 'tk' || v.dir.split('-')[0] === 'ha' ? 'tk' : 'dn'}>{DIRSHORT[v.dir] || v.dir}</Pill>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--chip)', overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: col, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>{v.pax}/{v.cap}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: col }}>{Math.round(v.t * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
