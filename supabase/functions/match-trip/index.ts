// match-trip — ĐiChung pooling edge function (Deno).
// Loads pending paid bookings + forming trips + idle drivers + route stops, runs the pure
// matching algorithm (../_shared/matching.mjs), and applies the plan with the service role
// (bypassing RLS). Invoked by: the bookings INSERT trigger, pg_cron (every minute), and the
// dispatch "⚡ Ghép ngay" button. Idempotent-ish: only acts on still-pending bookings.
//
// Deploy:  supabase functions deploy match-trip
// Local:   supabase functions serve match-trip
// config.toml sets verify_jwt=false; callers authenticate with the service-role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { planMatches } from '../_shared/matching.mjs';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    const now = new Date().toISOString();

    // ── load state ──────────────────────────────────────────────────────────
    const [{ data: pendingRaw }, { data: tripsRaw }, { data: driversRaw }, { data: busyRaw }, { data: stopsRaw }] =
      await Promise.all([
        supabase.from('bookings')
          .select('id, route_id, direction, service_type, pax, pickup, drop_off, preferred_at, trip_type, on_demand')
          .is('trip_id', null).eq('status', 'confirmed'),
        supabase.from('trips')
          .select('id, route_id, direction, service_type, seats_cap, depart_at, driver_id, status, drivers(rating), bookings(id, pax, pickup, drop_off)')
          .eq('status', 'forming'),
        supabase.from('drivers').select('id, seats, rating, status, kyc_status')
          .eq('status', 'active').eq('kyc_status', 'verified'),
        supabase.from('trips').select('driver_id').in('status', ['forming', 'enroute']),
        supabase.from('route_stops').select('route_id, name, seq, km'),
      ]);

    const busy = new Set((busyRaw || []).map((t) => t.driver_id).filter(Boolean));
    const routeStops: Record<string, unknown[]> = {};
    for (const s of stopsRaw || []) (routeStops[s.route_id] ||= []).push(s);

    const state = {
      now,
      routeStops,
      pending: (pendingRaw || []).map((b) => ({ ...b, drop: b.drop_off })),
      trips: (tripsRaw || []).map((t) => ({
        ...t,
        driver: { rating: t.drivers?.rating ?? 0 },
        bookings: (t.bookings || []).map((b) => ({ ...b, drop: b.drop_off })),
      })),
      idleDrivers: (driversRaw || []).filter((d) => !busy.has(d.id)),
    };

    const plan = planMatches(state);

    // ── apply plan (service role bypasses RLS) ───────────────────────────────
    const tempToId: Record<string, string> = {};

    for (const nt of plan.newTrips) {
      const { data: ins, error } = await supabase.from('trips').insert({
        route_id: nt.route_id, direction: nt.direction, service_type: nt.service_type,
        seats_cap: nt.seats_cap, depart_at: nt.depart_at, driver_id: nt.driver_id, status: 'forming',
      }).select('id').single();
      if (error) throw error;
      tempToId[nt.tempId] = ins.id;
      if (nt.bookingIds?.length) {
        await supabase.from('bookings').update({ trip_id: ins.id }).in('id', nt.bookingIds);
      }
    }

    for (const a of plan.assignments) {
      await supabase.from('bookings').update({ trip_id: a.tripId }).eq('id', a.bookingId);
    }

    for (const po of plan.pickupOrders) {
      await supabase.from('bookings').update({ pickup_order: po.pickup_order }).eq('id', po.bookingId);
    }

    for (const d of plan.departures) {
      const tripId = tempToId[d] || d;
      await supabase.from('trips').update({ status: 'enroute' }).eq('id', tripId);
    }

    return json({
      ok: true, at: now,
      pooled: plan.assignments.length,
      newTrips: plan.newTrips.length,
      departed: plan.departures.length,
      unmatched: plan.unmatched.length,
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
