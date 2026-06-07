// ĐiChung — quote-price engine (pricing source of truth). Pure & deterministic, encoding the
// design's rules so the customer app, admin and edge function agree. Node-testable; imported
// by quote-price/index.ts. Money is VND, VAT is 10% INCLUSIVE (extracted from the total).

// Distance (km) between an unordered city pair. Cities: tk, dn, ha, hue.
export const LEG_KM = { 'dn|tk': 70, 'dn|ha': 30, 'dn|hue': 95, 'ha|hue': 125, 'ha|tk': 95, 'hue|tk': 165 };
export const PER_KM = 1700;       // ghép price per km
export const MIN_FARE = 60000;    // ghép floor per seat
export const CARS = { sedan: 520000, suv: 720000, limo: 1150000 }; // bao base for the 70km leg
export const PROMOS = {
  DICHUNG10: { type: 'pct', val: 10, max: 30000 },
  GIAM20K: { type: 'fixed', val: 20000 },
  CHUYENDAU: { type: 'pct', val: 50, max: 60000 },
};

const round10k = (n) => Math.round(n / 10000) * 10000;

export function legKm(direction) {
  const [a, b] = String(direction).split('-');
  return LEG_KM[[a, b].sort().join('|')] ?? 70;
}
export function ghepBase(direction, perKm = PER_KM) {
  return Math.max(MIN_FARE, round10k(legKm(direction) * perKm));
}
export function baoPrice(carId, direction) {
  return round10k((CARS[carId] ?? CARS.sedan) * legKm(direction) / 70);
}
export function promoDiscount(code, total, promos = PROMOS) {
  const p = code && promos[String(code).toUpperCase()];
  if (!p) return 0;
  return p.type === 'pct' ? Math.min(Math.round((total * p.val) / 100), p.max ?? Infinity) : Math.min(p.val, total);
}

/**
 * Quote a fare. req: { direction, service_type:'ghep'|'bao', pax, car, promo_code, trip_type,
 * hour (0-23 for peak surge), perKm, surge_mult (admin-configured 17h–19h multiplier) }
 */
export function quote(req = {}) {
  const { direction, service_type = 'ghep', pax = 1, car, promo_code, trip_type = 'one_way', hour, surge_mult = 1, perKm } = req;
  if (!direction) throw new Error('direction required');

  const fare = service_type === 'bao' ? baoPrice(car, direction) : ghepBase(direction, perKm) * Math.max(1, pax);
  const peak = hour != null && hour >= 17 && hour < 19;     // admin surge window
  const surge = peak ? (surge_mult || 1) : 1;
  let subtotal = round10k(fare * surge);
  if (trip_type === 'round_trip') subtotal = round10k(subtotal * 1.9); // return leg ≈ −10% combo
  const discount = promoDiscount(promo_code, subtotal);
  const total = subtotal - discount;
  const vat = Math.round(total - total / 1.1);             // VAT 10% inclusive
  return { direction, service_type, legKm: legKm(direction), fare, surge, subtotal, discount, total, vat, currency: 'VND' };
}
