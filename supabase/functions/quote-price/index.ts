// quote-price — ĐiChung fare quote edge function (Deno). Wraps the pure pricing engine
// (../_shared/pricing.mjs), the pricing source of truth. POST a JSON body:
//   { direction:'tk-dn', service_type:'ghep'|'bao', pax, car, promo_code, trip_type, hour, surge_mult }
// → { ok, quote: { fare, surge, subtotal, discount, total, vat, ... } }
//
// config.toml sets verify_jwt=false (pricing is non-sensitive; callable before auth).
// Deploy: supabase functions deploy quote-price   ·   Local: supabase functions serve quote-price
import { quote } from '../_shared/pricing.mjs';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    return json({ ok: true, quote: quote(body) });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
