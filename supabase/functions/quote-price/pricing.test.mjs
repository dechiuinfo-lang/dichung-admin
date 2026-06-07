// Unit tests for the pricing engine.
// Run: node --test supabase/functions/quote-price/pricing.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, ghepBase, baoPrice, promoDiscount, legKm } from '../_shared/pricing.mjs';

test('ghép base = max(60k, round10k(km×1700))', () => {
  assert.equal(legKm('tk-dn'), 70);
  assert.equal(ghepBase('tk-dn'), 120000); // round10k(70*1700=119000)=120000
  assert.equal(ghepBase('dn-ha'), 60000); // round10k(30*1700=51000)=50000 → floored to 60000
  assert.equal(ghepBase('hue-tk'), 280000); // round10k(165*1700=280500)=280000
});

test('ghép fare scales with pax', () => {
  const q = quote({ direction: 'tk-dn', service_type: 'ghep', pax: 2 });
  assert.equal(q.fare, 240000);
  assert.equal(q.total, 240000);
});

test('VAT is 10% inclusive (extracted from total)', () => {
  const q = quote({ direction: 'tk-dn', pax: 1 });
  assert.equal(q.total, 120000);
  assert.equal(q.vat, Math.round(120000 - 120000 / 1.1)); // 10909
});

test('peak-hour surge applies 17h–19h with the admin multiplier', () => {
  const off = quote({ direction: 'tk-dn', hour: 9, surge_mult: 1.2 });
  const on = quote({ direction: 'tk-dn', hour: 18, surge_mult: 1.2 });
  assert.equal(off.surge, 1);
  assert.equal(on.surge, 1.2);
  assert.equal(on.subtotal, 140000); // round10k(120000*1.2=144000)
});

test('bao (whole car) scales by leg distance from the 70km base', () => {
  assert.equal(baoPrice('sedan', 'tk-dn'), 520000); // ×70/70
  assert.equal(baoPrice('suv', 'dn-hue'), 980000); // round10k(720000*95/70=977142)
  assert.equal(quote({ direction: 'tk-dn', service_type: 'bao', car: 'limo' }).total, 1150000);
});

test('promo: percent capped, fixed, invalid ignored', () => {
  assert.equal(promoDiscount('DICHUNG10', 120000), 12000); // 10% < 30k cap
  assert.equal(promoDiscount('CHUYENDAU', 200000), 60000); // 50%=100k but capped at 60k
  assert.equal(promoDiscount('GIAM20K', 120000), 20000); // fixed
  assert.equal(promoDiscount('NOPE', 120000), 0); // invalid
  const q = quote({ direction: 'tk-dn', promo_code: 'dichung10' });
  assert.equal(q.discount, 12000);
  assert.equal(q.total, 108000);
});

test('round-trip ≈ 1.9× (combo discount on return)', () => {
  const q = quote({ direction: 'tk-dn', trip_type: 'round_trip' });
  assert.equal(q.subtotal, 230000); // round10k(120000*1.9=228000)
});

test('missing direction throws', () => {
  assert.throws(() => quote({ service_type: 'ghep' }), /direction required/);
});
