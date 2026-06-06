// ĐiChung — pooling / driver-assignment / pickup-sequencing algorithm.
//
// Pure & deterministic (no IO, no Date.now, no Math.random) so it can be unit-tested with
// Node and imported by the Deno edge function (match-trip/index.ts). The edge function does
// the IO (load state from Postgres, apply the returned plan).
//
// Fixed-corridor pooling, NOT Grab-style nearest-driver: a corridor is a near-linear chain
// of stops with a km marker. "Direction" picks which way we travel the chain. Matching =
//   1) pool each paid+unassigned booking into the best forming trip (or open a new one),
//   2) assign an idle driver when opening a trip,
//   3) sequence pickups along the travel direction (min backtrack),
//   4) lock+depart trips that hit the fill threshold or the cutoff time.

/** @typedef {{name:string, seq:number, km:number}} Stop */
/** @typedef {{[routeId:string]: Stop[]}} RouteStops  forward-order stops per route */

export const DEFAULT_CONFIG = {
  windowMin: 45, // booking's depart time must be within this of its preferred time
  cutoffMin: 30, // depart a forming trip once it's within this many minutes of depart_at
  onDemandSoonMin: 15, // "đi ngay": only pool into trips leaving within this window, else go now
  fillThreshold: 0.6, // ...or once seats are this full
  // fill: this booking's seat contribution · consolidate: prefer trips already filling up
  // (fewer half-empty cars) · backtrack/timeDiff: penalties · rating: tie-break toward good drivers
  weights: { fill: 40, consolidate: 60, backtrack: 2, timeDiff: 0.5, rating: 0.3 },
};

const stopMap = (stops = []) => Object.fromEntries(stops.map((s) => [s.name, s]));

// Signed position along the *travel* direction. Forward = +km from origin; reverse routes
// (id like 'dn-tk' / forward route 'tk-dn') travel the chain backwards, so we negate.
function travelKm(routeStops, routeId, baseRouteId, reversed, stopName) {
  const s = stopMap(routeStops[baseRouteId])[stopName];
  if (!s) return null;
  return reversed ? -s.km : s.km;
}

// A booking carries route_id (the corridor, e.g. 'tk-dn') + direction (e.g. 'tk-dn' forward
// or 'dn-tk' reverse). We resolve everything against the forward corridor's stop chain.
function resolve(routeStops, direction, routeId) {
  // direction encodes the corridor + way; routeId is the forward corridor key.
  const reversed = direction !== routeId && direction.split('-').reverse().join('-') === routeId;
  return { baseRouteId: routeId, reversed };
}

export function seatsUsed(trip) {
  return (trip.bookings || []).reduce((n, b) => n + (b.pax || 1), 0);
}
export function seatsFree(trip) {
  return trip.seats_cap - seatsUsed(trip);
}

// pickup must come before drop in the travel direction (đón trước trả theo chiều).
export function onRouteOrder(routeStops, b) {
  const { baseRouteId, reversed } = resolve(routeStops, b.direction, b.route_id);
  const p = travelKm(routeStops, b.route_id, baseRouteId, reversed, b.pickup);
  const d = travelKm(routeStops, b.route_id, baseRouteId, reversed, b.drop);
  if (p == null || d == null) return false;
  return p < d;
}

// Extra distance a driver must backtrack to collect this booking's pickup, given the trip's
// current earliest-collected pickup. On a linear corridor a forward pickup adds ~0; a pickup
// "behind" the current frontier forces a backtrack — that's the real cost.
function backtrackKm(routeStops, trip, b) {
  const { baseRouteId, reversed } = resolve(routeStops, b.direction, b.route_id);
  const newPos = travelKm(routeStops, b.route_id, baseRouteId, reversed, b.pickup);
  if (newPos == null) return Infinity;
  const positions = (trip.bookings || [])
    .map((x) => travelKm(routeStops, b.route_id, baseRouteId, reversed, x.pickup))
    .filter((v) => v != null);
  if (!positions.length) return 0;
  const frontier = Math.min(...positions);
  return Math.max(0, frontier - newPos);
}

const minutesBetween = (a, b) => (!a || !b ? 0 : Math.abs(new Date(a) - new Date(b)) / 60000);

export function score(routeStops, trip, b, cfg = DEFAULT_CONFIG) {
  const w = cfg.weights;
  const fillGain = (b.pax || 1) / trip.seats_cap;          // this booking's contribution
  const existingFill = seatsUsed(trip) / trip.seats_cap;   // consolidate into fuller trips
  const backtrack = backtrackKm(routeStops, trip, b);
  const timeDiff = minutesBetween(trip.depart_at, b.preferred_at);
  const rating = trip.driver?.rating || 0;
  return w.fill * fillGain + w.consolidate * existingFill
    - w.backtrack * backtrack - w.timeDiff * timeDiff + w.rating * rating;
}

function hardOK(routeStops, trip, b, cfg) {
  if (trip.status !== 'forming') return false;
  if (trip.route_id !== b.route_id || trip.direction !== b.direction) return false;
  if (trip.service_type !== 'ghep' || b.service_type !== 'ghep') return false;
  if (seatsFree(trip) < (b.pax || 1)) return false;
  if (b.preferred_at && minutesBetween(trip.depart_at, b.preferred_at) > cfg.windowMin) return false;
  if (!onRouteOrder(routeStops, b)) return false;
  return true;
}

// Pick the smallest-capacity idle driver that still fits (don't waste a 9-seat van on 1 pax),
// breaking ties by higher rating then id for determinism.
function pickDriver(idleDrivers, pax) {
  return idleDrivers
    .filter((d) => d.status === 'active' && d.kyc_status === 'verified' && d.seats >= pax)
    .sort((a, b) => a.seats - b.seats || b.rating - a.rating || String(a.id).localeCompare(String(b.id)))[0] || null;
}

// Sequence a trip's pickups along the travel direction; returns [{bookingId, pickup_order}].
export function sequencePickups(routeStops, trip) {
  const first = trip.bookings[0];
  if (!first) return [];
  const { baseRouteId, reversed } = resolve(routeStops, trip.direction, trip.route_id);
  return [...trip.bookings]
    .sort((a, b) => {
      const pa = travelKm(routeStops, trip.route_id, baseRouteId, reversed, a.pickup) ?? 0;
      const pb = travelKm(routeStops, trip.route_id, baseRouteId, reversed, b.pickup) ?? 0;
      return pa - pb || String(a.id).localeCompare(String(b.id));
    })
    .map((b, i) => ({ bookingId: b.id, pickup_order: i + 1 }));
}

function shouldDepart(trip, now, cfg) {
  if (!trip.bookings.length) return false;
  if (seatsUsed(trip) / trip.seats_cap >= cfg.fillThreshold) return true;
  // signed: depart once we're within cutoffMin of depart_at OR already past it.
  if (trip.depart_at && (new Date(trip.depart_at) - new Date(now)) / 60000 <= cfg.cutoffMin) return true;
  return false;
}

/**
 * Plan matches. Inputs mirror DB rows; the function mutates only local working copies and
 * returns a plan the caller applies transactionally.
 * @returns {{assignments:Array,newTrips:Array,departures:Array,unmatched:Array}}
 */
export function planMatches(state) {
  const cfg = { ...DEFAULT_CONFIG, ...(state.config || {}) };
  const routeStops = state.routeStops || {};
  const now = state.now;
  // local working copies of forming trips (so seatsFree/score see in-progress assignments)
  const trips = (state.trips || []).map((t) => ({ ...t, bookings: [...(t.bookings || [])], _id: t.id }));
  const idle = [...(state.idleDrivers || [])];
  const usedDriverIds = new Set();

  const assignments = [];
  const newTrips = [];
  const unmatched = [];

  // On-demand "đi ngay" first (they want immediacy), then bao-xe, then round-trips, then FIFO.
  const pending = [...(state.pending || [])].sort(
    (a, b) =>
      (b.on_demand === true) - (a.on_demand === true) ||
      (b.service_type === 'bao') - (a.service_type === 'bao') ||
      (b.trip_type === 'round_trip') - (a.trip_type === 'round_trip') ||
      String(a.id).localeCompare(String(b.id)),
  );
  const soon = (t) => (new Date(t.depart_at) - new Date(now)) / 60000 <= cfg.onDemandSoonMin;

  let tempSeq = 0;
  for (const b of pending) {
    if (b.service_type === 'bao') {
      // whole-car: dedicate an idle driver, never pool.
      const driver = pickDriver(idle.filter((d) => !usedDriverIds.has(d.id)), b.pax || 1);
      if (!driver) { unmatched.push(b.id); continue; }
      usedDriverIds.add(driver.id);
      newTrips.push({ tempId: `new-${tempSeq++}`, route_id: b.route_id, direction: b.direction, service_type: 'bao', driver_id: driver.id, seats_cap: driver.seats, depart_at: b.preferred_at || now, bookingIds: [b.id] });
      continue;
    }
    // pooled: best forming trip, else open a new one. "đi ngay" only joins a trip leaving soon.
    const cands = trips.filter((t) => hardOK(routeStops, t, b, cfg) && (!b.on_demand || soon(t)));
    let best = null; let bestScore = -Infinity;
    for (const t of cands) {
      const s = score(routeStops, t, b, cfg);
      if (s > bestScore) { bestScore = s; best = t; }
    }
    if (best) {
      best.bookings.push(b);
      assignments.push({ bookingId: b.id, tripId: best._id });
      continue;
    }
    const driver = pickDriver(idle.filter((d) => !usedDriverIds.has(d.id)), b.pax || 1);
    if (!driver) { unmatched.push(b.id); continue; }
    usedDriverIds.add(driver.id);
    const nt = { tempId: `new-${tempSeq++}`, route_id: b.route_id, direction: b.direction, service_type: 'ghep', driver_id: driver.id, seats_cap: driver.seats, depart_at: b.preferred_at || now, _id: undefined, bookings: [b], driver, status: 'forming' };
    trips.push(nt); // allow subsequent bookings to pool into this fresh trip
    newTrips.push({ tempId: nt.tempId, route_id: nt.route_id, direction: nt.direction, service_type: 'ghep', driver_id: driver.id, seats_cap: driver.seats, depart_at: nt.depart_at, bookingIds: [b.id], ref: nt });
  }

  // sequence pickups + decide departures for every forming trip that has bookings
  const departures = [];
  const pickupOrders = [];
  for (const t of trips) {
    if (!t.bookings.length) continue;
    sequencePickups(routeStops, t).forEach((o) => pickupOrders.push({ ...o, tripId: t._id, tempId: t.tempId }));
    if (shouldDepart(t, now, cfg)) departures.push(t._id || t.tempId);
  }

  return { assignments, newTrips, departures, unmatched, pickupOrders };
}
