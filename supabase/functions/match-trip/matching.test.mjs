// Unit tests for the pure matching algorithm.
// Run: node --test supabase/functions/match-trip/matching.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planMatches, onRouteOrder, sequencePickups, seatsFree } from '../_shared/matching.mjs';

// Forward corridor Tam Kỳ(0) → Núi Thành(20) → Điện Bàn(45) → Đà Nẵng(70)
const routeStops = {
  'tk-dn': [
    { name: 'Tam Kỳ', seq: 1, km: 0 },
    { name: 'Núi Thành', seq: 2, km: 20 },
    { name: 'Điện Bàn', seq: 3, km: 45 },
    { name: 'Đà Nẵng', seq: 4, km: 70 },
  ],
};
const NOW = '2026-06-06T06:30:00Z';
const at = (h, m = 0) => `2026-06-06T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;

test('pools two same-direction bookings into one forming trip', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [
      { id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(7) },
      { id: 'b2', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 2, pickup: 'Núi Thành', drop: 'Đà Nẵng', preferred_at: at(7) },
    ],
    trips: [
      { id: 'tr1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(7), driver: { rating: 4.9 }, bookings: [] },
    ],
    idleDrivers: [],
  };
  const plan = planMatches(state);
  assert.equal(plan.assignments.length, 2, 'both pooled into the existing trip');
  assert.deepEqual(plan.assignments.map((a) => a.tripId).sort(), ['tr1', 'tr1']);
  assert.equal(plan.unmatched.length, 0);
});

test('best-fit picks the fuller trip, not the first', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [{ id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(7) }],
    trips: [
      { id: 'empty', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(7), driver: { rating: 5 }, bookings: [] },
      { id: 'fuller', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(7), driver: { rating: 4 }, bookings: [{ id: 'x', pax: 3, pickup: 'Tam Kỳ', drop: 'Đà Nẵng' }] },
    ],
    idleDrivers: [],
  };
  const plan = planMatches(state);
  assert.equal(plan.assignments[0].tripId, 'fuller', 'higher fill wins over first-fit');
});

test('opens a new trip with the smallest fitting idle driver when none fit', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [{ id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 2, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(8) }],
    trips: [],
    idleDrivers: [
      { id: 'd-big', seats: 9, rating: 5, status: 'active', kyc_status: 'verified' },
      { id: 'd-small', seats: 4, rating: 4.5, status: 'active', kyc_status: 'verified' },
    ],
  };
  const plan = planMatches(state);
  assert.equal(plan.newTrips.length, 1);
  assert.equal(plan.newTrips[0].driver_id, 'd-small', 'smallest car that fits, not the van');
});

test('rejects wrong-direction order (drop before pickup)', () => {
  const bad = { route_id: 'tk-dn', direction: 'tk-dn', pickup: 'Đà Nẵng', drop: 'Tam Kỳ' };
  assert.equal(onRouteOrder(routeStops, bad), false);
  const good = { route_id: 'tk-dn', direction: 'tk-dn', pickup: 'Tam Kỳ', drop: 'Đà Nẵng' };
  assert.equal(onRouteOrder(routeStops, good), true);
});

test('reverse direction (dn-tk) flips the order check', () => {
  const rev = { route_id: 'tk-dn', direction: 'dn-tk', pickup: 'Đà Nẵng', drop: 'Tam Kỳ' };
  assert.equal(onRouteOrder(routeStops, rev), true, 'going back, ĐN→TK is valid');
});

test('sequences pickups by travel distance', () => {
  const trip = {
    route_id: 'tk-dn', direction: 'tk-dn',
    bookings: [
      { id: 'late', pickup: 'Điện Bàn' },
      { id: 'first', pickup: 'Tam Kỳ' },
      { id: 'mid', pickup: 'Núi Thành' },
    ],
  };
  const seq = sequencePickups(routeStops, trip);
  assert.deepEqual(seq.map((s) => s.bookingId), ['first', 'mid', 'late']);
  assert.deepEqual(seq.map((s) => s.pickup_order), [1, 2, 3]);
});

test('does not exceed capacity', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [
      { id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 3, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(7) },
      { id: 'b2', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', pax: 3, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(7) },
    ],
    trips: [{ id: 'tr1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 4, status: 'forming', depart_at: at(7), driver: { rating: 5 }, bookings: [] }],
    idleDrivers: [{ id: 'd2', seats: 4, rating: 4, status: 'active', kyc_status: 'verified' }],
  };
  const plan = planMatches(state);
  // first booking (3 pax) fits tr1; second (3 pax) can't (only 1 seat left) → new trip
  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.newTrips.length, 1);
});

test('departs a trip past the fill threshold', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [],
    trips: [{ id: 'tr1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 4, status: 'forming', depart_at: at(9), driver: { rating: 5 }, bookings: [{ id: 'x', pax: 3, pickup: 'Tam Kỳ', drop: 'Đà Nẵng' }] }],
    idleDrivers: [],
  };
  const plan = planMatches(state); // 3/4 = 0.75 >= 0.6 threshold
  assert.deepEqual(plan.departures, ['tr1']);
});

test('departs a trip once its depart time is reached, even if under-filled', () => {
  const state = {
    now: at(7, 5), // 5 min PAST the 07:00 departure
    routeStops,
    pending: [],
    trips: [{ id: 'tr1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(7), driver: { rating: 5 }, bookings: [{ id: 'x', pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng' }] }],
    idleDrivers: [],
  };
  const plan = planMatches(state); // 1/7 fill, but past depart_at + cutoff
  assert.deepEqual(plan.departures, ['tr1']);
});

test('on-demand "đi ngay" opens a new trip and departs immediately when no trip leaves soon', () => {
  const state = {
    now: NOW, // 06:30
    routeStops,
    pending: [{ id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', on_demand: true, pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: NOW }],
    trips: [{ id: 'far', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(8), driver: { rating: 5 }, bookings: [] }],
    idleDrivers: [{ id: 'd2', seats: 4, rating: 4.8, status: 'active', kyc_status: 'verified' }],
  };
  const plan = planMatches(state);
  assert.equal(plan.assignments.length, 0, 'does not pool into the far-off trip');
  assert.equal(plan.newTrips.length, 1, 'spins up its own trip now');
  assert.ok(plan.departures.includes(plan.newTrips[0].tempId), 'and departs immediately');
});

test('on-demand pools into a trip that is leaving soon (and that trip departs)', () => {
  const state = {
    now: NOW, // 06:30
    routeStops,
    pending: [{ id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', on_demand: true, pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: NOW }],
    trips: [{ id: 'soon', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(6, 40), driver: { rating: 5 }, bookings: [{ id: 'x', pax: 1, pickup: 'Tam Kỳ', drop: 'Đà Nẵng' }] }],
    idleDrivers: [],
  };
  const plan = planMatches(state);
  assert.equal(plan.assignments[0]?.tripId, 'soon', 'joins the imminent trip');
  assert.ok(plan.departures.includes('soon'), 'which then departs');
});

test('whole-car (bao) never pools and takes a dedicated driver', () => {
  const state = {
    now: NOW,
    routeStops,
    pending: [{ id: 'b1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'bao', pax: 4, pickup: 'Tam Kỳ', drop: 'Đà Nẵng', preferred_at: at(8) }],
    trips: [{ id: 'tr1', route_id: 'tk-dn', direction: 'tk-dn', service_type: 'ghep', seats_cap: 7, status: 'forming', depart_at: at(8), driver: { rating: 5 }, bookings: [] }],
    idleDrivers: [{ id: 'd2', seats: 7, rating: 4.8, status: 'active', kyc_status: 'verified' }],
  };
  const plan = planMatches(state);
  assert.equal(plan.assignments.length, 0, 'bao not pooled into ghep trip');
  assert.equal(plan.newTrips.length, 1);
  assert.equal(plan.newTrips[0].service_type, 'bao');
});
