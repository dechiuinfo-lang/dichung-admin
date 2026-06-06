// Data-access layer for Supabase mode. Each function returns/accepts the SAME shapes
// the admin modules already use (the mock arrays), so modules need no changes — only
// the data source behind useData() swaps. Row→shape mapping lives here.
import { supabase } from './supabase.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const must = (res) => { if (res.error) throw res.error; return res.data; };

export function relTime(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 90) return 'Vừa xong';
  if (diff < 3600) return `${Math.round(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.round(diff / 3600)} giờ trước`;
  if (diff < 172800) return 'Hôm qua';
  return `${Math.round(diff / 86400)} ngày trước`;
}

const ddmm = (d) => {
  if (!d) return '—';
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

// ── drivers ───────────────────────────────────────────────────────────────────
const mapDriver = (r) => ({
  id: r.id, name: r.profiles.full_name, phone: r.profiles.phone || '',
  model: r.vehicle_model, plate: r.plate, seats: r.seats,
  rating: Number(r.rating) || 0, trips: r.trips_count,
  status: r.status, kyc: r.kyc_status, joined: r.joined,
});
export async function fetchDrivers() {
  return must(await supabase
    .from('drivers')
    .select('id, vehicle_model, plate, seats, kyc_status, status, rating, trips_count, joined, profiles!inner(full_name, phone)')
    .order('created_at', { ascending: true })).map(mapDriver);
}
export async function updateDriver(id, patch) {
  // patch uses mock keys (status, kyc) → column names
  const cols = {};
  if (patch.status) cols.status = patch.status;
  if (patch.kyc) cols.kyc_status = patch.kyc;
  return must(await supabase.from('drivers').update(cols).eq('id', id).select('id'));
}

// ── routes / surge ────────────────────────────────────────────────────────────
const mapRoute = (r) => ({
  id: r.id, name: r.name, km: r.distance_km, perKm: r.price_per_km,
  base: r.base_fee, trips: r.trips_per_day, active: r.active,
});
export async function fetchRoutes() {
  return must(await supabase.from('routes').select('*').order('id')).map(mapRoute);
}
export async function fetchSurge() {
  const rows = must(await supabase.from('routes').select('surge_mult').limit(1));
  return rows[0] ? Number(rows[0].surge_mult) : 1.0;
}
export async function updateRoute(id, patch) {
  const cols = {};
  if ('km' in patch) cols.distance_km = patch.km;
  if ('perKm' in patch) cols.price_per_km = patch.perKm;
  if ('base' in patch) cols.base_fee = patch.base;
  if ('active' in patch) cols.active = patch.active;
  if ('surge_mult' in patch) cols.surge_mult = patch.surge_mult;
  return must(await supabase.from('routes').update(cols).eq('id', id).select('id'));
}

// ── promos ────────────────────────────────────────────────────────────────────
const mapPromo = (r) => ({
  code: r.code,
  type: r.discount_type === 'percent' ? `${r.discount_value}%` : `${r.discount_value.toLocaleString('vi-VN')}đ`,
  cap: r.cap ? `${Math.round(r.cap / 1000)}k` : '—',
  used: r.used,
  limit: r.usage_limit == null ? '∞' : String(r.usage_limit),
  active: r.active,
  exp: ddmm(r.expires_at),
});
export async function fetchPromos() {
  return must(await supabase.from('promos').select('*').order('created_at', { ascending: false })).map(mapPromo);
}
export async function togglePromoActive(code, active) {
  return must(await supabase.from('promos').update({ active }).eq('code', code).select('code'));
}
// Parse 'dd/MM' (current year) into an ISO date, validating it's a real calendar date.
// Returns null for empty input; throws on an invalid date so the caller surfaces it.
export function parsePromoExp(exp) {
  if (!exp || !exp.trim()) return null;
  const m4 = exp.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m4) throw new Error('Ngày hết hạn phải dạng dd/MM');
  const day = +m4[1]; const mon = +m4[2];
  const year = new Date().getFullYear();
  const dt = new Date(year, mon - 1, day);
  if (dt.getMonth() !== mon - 1 || dt.getDate() !== day) throw new Error('Ngày hết hạn không hợp lệ');
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// '30k' → 30000, '30000' → 30000, '' / '—' → null. Throws on garbage.
export function parsePromoCap(cap) {
  const s = (cap || '').trim();
  if (!s || s === '—') return null;
  const mk = s.match(/^(\d+)\s*k$/i);
  if (mk) return +mk[1] * 1000;
  if (/^\d+$/.test(s)) return +s;
  throw new Error('Giảm tối đa phải dạng "30k" hoặc số tiền (đồng)');
}

export async function insertPromo(p) {
  // p comes from the modal: { code, type, cap, limit, exp, active }
  const pct = /%$/.test(p.type);
  const value = parseInt(p.type.replace(/[^\d]/g, ''), 10) || 0;
  const cap = parsePromoCap(p.cap);
  const expires = parsePromoExp(p.exp);
  return must(await supabase.from('promos').insert({
    code: p.code,
    discount_type: pct ? 'percent' : 'fixed',
    discount_value: value,
    cap,
    usage_limit: p.limit === '∞' || !p.limit ? null : parseInt(p.limit, 10),
    active: p.active ?? true,
    expires_at: expires,
  }).select('code'));
}

// ── payouts ───────────────────────────────────────────────────────────────────
const mapPayout = (r) => ({
  id: r.id, driver: r.drivers?.profiles?.full_name || '—', trips: r.trips_count,
  gross: r.gross, commission: r.commission, net: r.net_amount, status: r.status,
});
export async function fetchPayouts() {
  return must(await supabase
    .from('payouts')
    .select('id, trips_count, gross, commission, net_amount, status, drivers!inner(profiles!inner(full_name))')
    .order('created_at', { ascending: true })).map(mapPayout);
}
export async function markPayoutPaid(id) {
  return must(await supabase.from('payouts').update({ status: 'paid' }).eq('id', id).select('id'));
}

// ── support tickets ───────────────────────────────────────────────────────────
const mapTicket = (r) => ({
  id: r.id, user: r.user_name, type: r.issue_type, trip: r.trip_label,
  pri: r.priority, status: r.status, time: relTime(r.created_at),
});
export async function fetchTickets() {
  return must(await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })).map(mapTicket);
}
export async function advanceTicketStatus(id, next) {
  return must(await supabase.from('support_tickets').update({ status: next }).eq('id', id).select('id'));
}

// ── staff ─────────────────────────────────────────────────────────────────────
const mapStaff = (r) => ({ name: r.full_name, email: r.email, role: r.role, perms: r.perms, active: r.active });
export async function fetchStaff() {
  return must(await supabase.from('staff').select('*').order('created_at', { ascending: true })).map(mapStaff);
}
export async function toggleStaffActive(email, active) {
  return must(await supabase.from('staff').update({ active }).eq('email', email).select('email'));
}
export async function insertStaff(s) {
  return must(await supabase.from('staff').insert({
    full_name: s.name, email: s.email, role: s.role, perms: s.perms || [], active: true,
  }).select('email'));
}
