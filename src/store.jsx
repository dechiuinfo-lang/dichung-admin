import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import * as api from './lib/api.js';
import {
  A_DRIVERS, A_CORRIDORS, A_PROMOS, A_PAYOUTS, A_TICKETS, A_STAFF,
} from './data/mockData.js';

// App-wide data store with the SAME `useData()` API in both modes:
//  • mock      — in-memory useState over the seed arrays (default, no backend).
//  • supabase  — TanStack Query reads + write-through mutations against Postgres.
// Modules consume useData() and don't know or care which is active.
const DataCtx = createContext(null);

// Shared UI state (topbar search + toast) used by both providers.
function useUiState() {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg) => setToast((t) => ({ msg, id: (t?.id || 0) + 1 })), []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);
  return { query, setQuery, toast, notify };
}

// ─── Mock provider ────────────────────────────────────────────────────────────
function MockProvider({ children }) {
  const ui = useUiState();
  const [drivers, setDrivers] = useState(A_DRIVERS);
  const [corridors, setCorridors] = useState(A_CORRIDORS);
  const [surge, setSurge] = useState(1.2);
  const [promos, setPromos] = useState(A_PROMOS);
  const [payouts, setPayouts] = useState(A_PAYOUTS);
  const [tickets, setTickets] = useState(A_TICKETS);
  const [staff, setStaff] = useState(A_STAFF);

  const value = {
    ...ui,
    drivers,
    setDriver: (id, patch) => setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    addDriver: (d) => setDrivers((ds) => [{ id: 'd' + (ds.length + 1), rating: 0, trips: 0, status: 'pending', kyc: 'review', joined: '2026-06', ...d }, ...ds]),
    corridors,
    setCorridor: (id, patch) => setCorridors((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    surge, setSurge,
    savePricing: () => ui.notify('Đã lưu thay đổi bảng giá'),
    runMatch: async () => null, // board runs the local simulation in mock mode
    loading: false, queryError: null, realtime: false,
    promos,
    togglePromo: (code) => setPromos((ps) => ps.map((p) => (p.code === code ? { ...p, active: !p.active } : p))),
    addPromo: (p) => setPromos((ps) => [{ used: 0, ...p }, ...ps]),
    payouts,
    payPayout: (id) => setPayouts((ps) => ps.map((p) => (p.id === id ? { ...p, status: 'paid' } : p))),
    tickets,
    advanceTicket: (id) => setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status: t.status === 'open' ? 'progress' : 'closed' } : t))),
    staff,
    toggleStaff: (email) => setStaff((ss) => ss.map((s) => (s.email === email ? { ...s, active: !s.active } : s))),
    addStaff: (s) => setStaff((ss) => [...ss, { active: true, perms: [], ...s }]),
  };
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ─── Supabase provider (TanStack Query) ───────────────────────────────────────
function SupabaseProvider({ children }) {
  const ui = useUiState();
  const qc = useQueryClient();
  const inv = (...keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const driversQ = useQuery({ queryKey: ['drivers'], queryFn: api.fetchDrivers });
  const routesQ = useQuery({ queryKey: ['routes'], queryFn: api.fetchRoutes });
  const surgeQ = useQuery({ queryKey: ['surge'], queryFn: api.fetchSurge });
  const promosQ = useQuery({ queryKey: ['promos'], queryFn: api.fetchPromos });
  const payoutsQ = useQuery({ queryKey: ['payouts'], queryFn: api.fetchPayouts });
  const ticketsQ = useQuery({ queryKey: ['tickets'], queryFn: api.fetchTickets });
  const staffQ = useQuery({ queryKey: ['staff'], queryFn: api.fetchStaff });

  // corridors + surge are edited live (text fields / slider) then persisted by
  // savePricing — keep a local mirror seeded from the query to avoid per-keystroke writes.
  const [corridors, setCorridors] = useState([]);
  const [surge, setSurge] = useState(1.2);
  useEffect(() => { if (routesQ.data) setCorridors(routesQ.data); }, [routesQ.data]);
  useEffect(() => { if (surgeQ.data != null) setSurge(surgeQ.data); }, [surgeQ.data]);

  // Realtime: subscribe to row changes on the admin tables and invalidate the matching
  // query so the console stays live. Drives the topbar "Realtime" indicator.
  const [realtime, setRealtime] = useState(false);
  useEffect(() => {
    const tableKey = { drivers: 'drivers', routes: 'routes', promos: 'promos', payouts: 'payouts', support_tickets: 'tickets', staff: 'staff' };
    const ch = supabase.channel('admin-db');
    Object.keys(tableKey).forEach((table) => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        qc.invalidateQueries({ queryKey: [tableKey[table]] });
        if (table === 'routes') qc.invalidateQueries({ queryKey: ['surge'] });
      });
    });
    ch.subscribe((status) => setRealtime(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const queries = [driversQ, routesQ, surgeQ, promosQ, payoutsQ, ticketsQ, staffQ];

  const value = {
    loading: queries.some((q) => q.isLoading),
    queryError: queries.find((q) => q.isError)?.error || null,
    realtime,
    ...ui,
    drivers: driversQ.data || [],
    setDriver: (id, patch) => api.updateDriver(id, patch).then(() => inv('drivers')).catch((e) => ui.notify('Lỗi: ' + e.message)),
    addDriver: () => ui.notify('Tài xế đăng ký qua app + duyệt KYC — chưa bật thêm thủ công trong demo'),
    corridors,
    setCorridor: (id, patch) => setCorridors((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    surge, setSurge,
    savePricing: async () => {
      try {
        await Promise.all(corridors.map((c) => api.updateRoute(c.id, { ...c, surge_mult: surge })));
        inv('routes', 'surge');
        ui.notify('Đã lưu thay đổi bảng giá');
      } catch (e) { ui.notify('Lỗi: ' + e.message); }
    },
    runMatch: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('match-trip', { body: {} });
        if (error) throw error;
        inv('drivers');
        ui.notify(`Đã ghép: ${data?.pooled ?? 0} khách · ${data?.newTrips ?? 0} chuyến mới · ${data?.departed ?? 0} khởi hành`);
      } catch (e) { ui.notify('Lỗi ghép: ' + e.message); }
    },
    promos: promosQ.data || [],
    togglePromo: (code) => {
      const cur = (promosQ.data || []).find((p) => p.code === code);
      api.togglePromoActive(code, !cur?.active).then(() => inv('promos')).catch((e) => ui.notify('Lỗi: ' + e.message));
    },
    addPromo: (p) => api.insertPromo(p).then(() => inv('promos')).catch((e) => ui.notify('Lỗi: ' + e.message)),
    payouts: payoutsQ.data || [],
    payPayout: (id) => api.markPayoutPaid(id).then(() => inv('payouts')).catch((e) => ui.notify('Lỗi: ' + e.message)),
    tickets: ticketsQ.data || [],
    advanceTicket: (id) => {
      const cur = (ticketsQ.data || []).find((t) => t.id === id);
      const next = cur?.status === 'open' ? 'progress' : 'closed';
      api.advanceTicketStatus(id, next).then(() => inv('tickets')).catch((e) => ui.notify('Lỗi: ' + e.message));
    },
    staff: staffQ.data || [],
    toggleStaff: (email) => {
      const cur = (staffQ.data || []).find((s) => s.email === email);
      api.toggleStaffActive(email, !cur?.active).then(() => inv('staff')).catch((e) => ui.notify('Lỗi: ' + e.message));
    },
    addStaff: (s) => api.insertStaff(s).then(() => inv('staff')).catch((e) => ui.notify('Lỗi: ' + e.message)),
  };
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function DataProvider({ children }) {
  return isSupabaseConfigured
    ? <SupabaseProvider>{children}</SupabaseProvider>
    : <MockProvider>{children}</MockProvider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
