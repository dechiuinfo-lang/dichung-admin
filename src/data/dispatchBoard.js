// Dispatch board — simulated "realtime" operational state (ported from the design
// prototype's board.jsx). Pure updates return a new board so React re-renders cleanly.
// In Supabase mode the ⚡ Ghép ngay button ALSO triggers the real match-trip engine
// (see store.runMatch); this local board drives the visible, interactive simulation.

export const DIRSHORT = {
  'tk-dn': 'TK → ĐN', 'dn-tk': 'ĐN → TK',
  'dn-hue': 'ĐN → Huế', 'hue-dn': 'Huế → ĐN',
  'ha-dn': 'HA → ĐN', 'dn-ha': 'ĐN → HA',
  'ha-hue': 'HA → Huế', 'hue-ha': 'Huế → HA',
};

const NAMES = ['Minh', 'Hoa', 'Tâm', 'Dũng', 'Lan', 'Phúc', 'Trang', 'Quân', 'Ngọc', 'Hải', 'Vy', 'Sơn'];
let _id = 100;
const nid = (p) => p + (++_id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function seedDrivers() {
  return [
    { id: 'd1', name: 'Anh Tuấn', initials: 'T', model: 'Toyota Innova', plate: '92A-123.45', seats: 7, rating: 4.9, trips: 1280, status: 'enroute', approved: true },
    { id: 'd2', name: 'Anh Hùng', initials: 'H', model: 'Toyota Vios', plate: '43A-678.90', seats: 4, rating: 4.8, trips: 940, status: 'forming', approved: true },
    { id: 'd3', name: 'Chị Lan', initials: 'L', model: 'Ford Transit', plate: '92B-456.78', seats: 9, rating: 5.0, trips: 612, status: 'forming', approved: true },
    { id: 'd4', name: 'Anh Phát', initials: 'P', model: 'Kia Carnival', plate: '92A-901.23', seats: 7, rating: 0, trips: 0, status: 'offline', approved: false },
    { id: 'd5', name: 'Anh Kiên', initials: 'K', model: 'Hyundai Custin', plate: '43A-222.11', seats: 7, rating: 4.7, trips: 305, status: 'idle', approved: true },
  ];
}

const booking = (order, name, pax, pickup) => ({ id: nid('b'), order, name, pax, pickup });

function seedTrips(drivers) {
  const [tuan, hung, lan] = ['d1', 'd2', 'd3'].map((id) => drivers.find((d) => d.id === id));
  return [
    { id: 'tr1', direction: 'tk-dn', slot: '07:00', service_type: 'ghep', seats_cap: 7, status: 'enroute', driver: tuan, bookings: [booking(1, 'Minh', 1, 'Chợ Tam Kỳ'), booking(2, 'Hoa', 2, 'Núi Thành'), booking(3, 'Tâm', 1, 'An Sơn')] },
    { id: 'tr2', direction: 'tk-dn', slot: '08:30', service_type: 'ghep', seats_cap: 4, status: 'forming', driver: hung, bookings: [booking(1, 'Dũng', 1, 'BX Tam Kỳ')] },
    { id: 'tr3', direction: 'dn-hue', slot: '09:00', service_type: 'ghep', seats_cap: 9, status: 'forming', driver: lan, bookings: [booking(1, 'Trang', 1, 'Cầu Rồng'), booking(2, 'Ngọc', 2, 'Hải Châu')] },
  ];
}

function seedPending() {
  return [
    { id: nid('p'), direction: 'tk-dn', name: 'Lan', pax: 1, service_type: 'ghep', pickup: 'Trường Xuân', drop: 'Hải Châu' },
    { id: nid('p'), direction: 'tk-dn', name: 'Phúc', pax: 2, service_type: 'ghep', pickup: 'Tam Phú', drop: 'Biển Mỹ Khê' },
    { id: nid('p'), direction: 'dn-hue', name: 'Vy', pax: 1, service_type: 'ghep', pickup: 'Biển Mỹ Khê', drop: 'Đại Nội' },
    { id: nid('p'), direction: 'ha-dn', name: 'Sơn', pax: 1, service_type: 'bao', pickup: 'Phố cổ Hội An', drop: 'Sân bay Đà Nẵng' },
  ];
}

export const seatsUsed = (t) => t.bookings.reduce((n, b) => n + b.pax, 0);

function withStats(b) {
  b.stats = {
    pending: b.pending.length,
    forming: b.trips.filter((t) => t.status === 'forming').length,
    enroute: b.trips.filter((t) => t.status === 'enroute').length,
    completed: b.completed,
    revenue: b.revenue,
  };
  return b;
}

export function makeBoard() {
  const drivers = seedDrivers();
  return withStats({ drivers, trips: seedTrips(drivers), pending: seedPending(), completed: 3, revenue: 1830000 });
}

const clone = (b) => ({ ...b, drivers: [...b.drivers], trips: b.trips.map((t) => ({ ...t, bookings: [...t.bookings] })), pending: [...b.pending] });

const newEnrouteTrip = (driver, p) => ({
  id: nid('tr'), direction: p.direction, slot: null, service_type: 'ghep', seats_cap: driver.seats,
  status: 'enroute', driver, bookings: [booking(1, p.name, p.pax, p.pickup)], onDemand: true,
});

// ⚡ Ghép ngay — best-fit-ish: pool each pending ghep passenger into the fullest forming
// same-direction trip with room. On-demand "đi ngay" passengers get an idle driver + an
// immediate enroute trip (or a soon-leaving forming trip), else stay queued.
export function matchPending(board) {
  const b = clone(board);
  const remaining = [];
  for (const p of b.pending) {
    if (p.onDemand) {
      const idle = b.drivers.find((x) => x.approved && x.status === 'idle');
      if (idle) { idle.status = 'enroute'; b.trips.unshift(newEnrouteTrip(idle, p)); continue; }
      const trip = b.trips.find((t) => t.status === 'forming' && t.direction === p.direction && seatsUsed(t) + p.pax <= t.seats_cap);
      if (trip) {
        trip.bookings.push(booking(trip.bookings.length + 1, p.name, p.pax, p.pickup));
        trip.status = 'enroute';
        const d = trip.driver && b.drivers.find((x) => x.id === trip.driver.id); if (d) d.status = 'enroute';
        continue;
      }
      remaining.push(p); continue;
    }
    if (p.service_type !== 'ghep') { remaining.push(p); continue; }
    const cands = b.trips.filter((t) => t.status === 'forming' && t.direction === p.direction && t.service_type === 'ghep' && seatsUsed(t) + p.pax <= t.seats_cap);
    const trip = cands.sort((a, c) => seatsUsed(c) - seatsUsed(a))[0];
    if (trip) trip.bookings.push(booking(trip.bookings.length + 1, p.name, p.pax, p.pickup));
    else remaining.push(p);
  }
  b.pending = remaining;
  return withStats(b);
}

// "Đi ngay" — a passenger requesting an immediate ride: dispatch an idle driver right away,
// else queue them as an on-demand pending (next freed driver / ⚡ Ghép ngay picks them up).
export function onDemand(board) {
  const b = clone(board);
  const [dir, ups] = pick(WALK_DIRS);
  const p = { id: nid('p'), direction: dir, name: pick(NAMES), pax: Math.random() > 0.7 ? 2 : 1, service_type: 'ghep', pickup: pick(ups), drop: '', onDemand: true };
  const idle = b.drivers.find((x) => x.approved && x.status === 'idle');
  if (idle) { idle.status = 'enroute'; b.trips.unshift(newEnrouteTrip(idle, p)); }
  else b.pending.unshift(p);
  return withStats(b);
}

export function depart(board, tripId) {
  const b = clone(board);
  const t = b.trips.find((x) => x.id === tripId);
  if (t) { t.status = 'enroute'; const d = t.driver && b.drivers.find((x) => x.id === t.driver.id); if (d) d.status = 'enroute'; }
  return withStats(b);
}

export function complete(board, tripId) {
  const b = clone(board);
  const t = b.trips.find((x) => x.id === tripId);
  if (t) {
    b.completed += 1;
    b.revenue += seatsUsed(t) * 120000;
    const d = t.driver && b.drivers.find((x) => x.id === t.driver.id); if (d) d.status = 'idle';
    b.trips = b.trips.filter((x) => x.id !== tripId);
  }
  return withStats(b);
}

export function approve(board, driverId) {
  const b = clone(board);
  const d = b.drivers.find((x) => x.id === driverId);
  if (d) { d.approved = true; d.status = 'idle'; d.rating = 5.0; }
  return withStats(b);
}

const WALK_DIRS = [
  ['tk-dn', ['Chợ Tam Kỳ', 'Núi Thành', 'Tam Phú']],
  ['dn-hue', ['Cầu Rồng', 'Hải Châu', 'Biển Mỹ Khê']],
  ['ha-dn', ['Phố cổ Hội An', 'Cẩm Châu']],
];
export function addPending(board) {
  const b = clone(board);
  const [dir, ups] = pick(WALK_DIRS);
  b.pending.push({ id: nid('p'), direction: dir, name: pick(NAMES), pax: Math.random() > 0.7 ? 2 : 1, service_type: 'ghep', pickup: pick(ups), drop: '' });
  return withStats(b);
}
