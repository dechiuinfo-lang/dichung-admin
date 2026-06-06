// Live dispatch data — Supabase reads/mutations mapped to the board shapes the Dispatch
// components render (same shapes as src/data/dispatchBoard.js produces in mock mode).
import { supabase } from './supabase.js';

const must = (res) => { if (res.error) throw res.error; return res.data; };
const hhmm = (iso) => (iso ? new Date(iso).toISOString().slice(11, 16) : null);

// ── trips (forming + enroute) with driver + bookings ──────────────────────────
export async function fetchDispatchTrips() {
  const rows = must(await supabase
    .from('trips')
    .select('id, driver_id, direction, depart_at, service_type, seats_cap, status, drivers(plate, profiles(full_name)), bookings(id, pax, pickup, pickup_order, on_demand)')
    .in('status', ['forming', 'enroute'])
    .order('depart_at', { ascending: true }));
  return rows.map((t) => ({
    id: t.id,
    driverId: t.driver_id,
    direction: t.direction,
    slot: hhmm(t.depart_at),
    service_type: t.service_type,
    seats_cap: t.seats_cap,
    status: t.status,
    driver: t.drivers ? { name: t.drivers.profiles?.full_name || '—', plate: t.drivers.plate } : null,
    onDemand: (t.bookings || []).some((b) => b.on_demand),
    bookings: [...(t.bookings || [])]
      .sort((a, b) => (a.pickup_order || 0) - (b.pickup_order || 0))
      .map((b, i) => ({ id: b.id, order: b.pickup_order || i + 1, name: 'Khách', pax: b.pax, pickup: b.pickup })),
  }));
}

// ── pending (unassigned paid bookings) ────────────────────────────────────────
export async function fetchDispatchPending() {
  const rows = must(await supabase
    .from('bookings')
    .select('id, direction, pax, pickup, service_type, on_demand')
    .is('trip_id', null).eq('status', 'confirmed')
    .order('created_at', { ascending: true }));
  return rows.map((b) => ({ id: b.id, direction: b.direction, name: 'Khách', pax: b.pax, pickup: b.pickup, service_type: b.service_type, onDemand: b.on_demand }));
}

// ── fleet (drivers) — operational status derived from active trips ─────────────
export async function fetchFleet() {
  return must(await supabase
    .from('drivers')
    .select('id, status, kyc_status, vehicle_model, plate, profiles(full_name)')
    .order('created_at', { ascending: true }));
}

const initialOf = (name) => (name || '').trim().split(/\s+/).filter(Boolean).pop()?.[0]?.toUpperCase() || 'A';
export function mapFleet(driverRow, trips) {
  const t = trips.find((x) => x.driverId === driverRow.id);
  const op = t ? t.status : driverRow.status === 'active' ? 'idle' : 'offline'; // forming/enroute/idle/offline
  return {
    id: driverRow.id,
    name: driverRow.profiles?.full_name || '—',
    initials: initialOf(driverRow.profiles?.full_name),
    model: driverRow.vehicle_model,
    plate: driverRow.plate,
    status: op,
    approved: driverRow.status !== 'pending',
  };
}

// ── stats (completed today + revenue from done trips) ─────────────────────────
export async function fetchDispatchStats() {
  const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('status', 'done');
  const { data } = await supabase.from('bookings').select('amount, trips!inner(status)').eq('trips.status', 'done');
  const revenue = (data || []).reduce((n, b) => n + (b.amount || 0), 0);
  return { completed: count || 0, revenue };
}

// ── mutations ─────────────────────────────────────────────────────────────────
export const departTrip = (id) => must2(supabase.from('trips').update({ status: 'enroute' }).eq('id', id));
export const completeTrip = (id) => must2(supabase.from('trips').update({ status: 'done' }).eq('id', id));
export const approveDriver = (id) => must2(supabase.from('drivers').update({ status: 'active', kyc_status: 'verified' }).eq('id', id));
export const runMatch = () => supabase.functions.invoke('match-trip', { body: {} });

const WALK = [
  ['tk-dn', ['Tam Kỳ', 'Tam Phú', 'Núi Thành'], 'Hải Châu'],
  ['ha-dn-hue', ['Hội An', 'Đà Nẵng'], 'Huế'],
];
export async function addOnDemand() {
  const [route, ups, drop] = WALK[Math.floor((Date.now() / 1000) % WALK.length)];
  const { data: { user } } = await supabase.auth.getUser();
  return must2(supabase.from('bookings').insert({
    route_id: route, direction: route, service_type: 'ghep', pax: 1,
    pickup: ups[Math.floor((Date.now() / 7) % ups.length)], drop_off: drop,
    preferred_at: new Date().toISOString(), amount: 120000, status: 'confirmed',
    on_demand: true, passenger_id: user?.id ?? null,
  }));
}

async function must2(q) { const { error } = await q; if (error) throw error; }
