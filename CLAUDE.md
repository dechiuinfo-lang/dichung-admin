# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production bundle → dist/
npm run preview    # serve the built bundle
npm run test:match # matching-engine unit tests (node --test)

# Supabase (CLI is a dev-dependency; needs a Docker runtime for `start`)
npm run db:start   # supabase start (local stack)   ·  db:stop / db:reset
npm run fn:serve   # supabase functions serve match-trip
```

No linter/formatter is configured. The only automated tests are the matching unit tests
(`npm run test:match`) — pure logic, the one backend piece verifiable without a DB.

## What this is

A production React (Vite) recreation of the **ĐiChung Admin Console** — the desktop
admin surface (quản trị / kế toán / CSKH) for an intercity ride-pooling & whole-car
charter marketplace in central Vietnam (corridors Tam Kỳ ⇄ Đà Nẵng and Hội An – Đà Nẵng – Huế).

It was hand-built from a Claude Design handoff bundle (still in `_design_bundle/`, gitignored,
5 surfaces). **Built & deployed:** this **Admin web app** (which absorbs the design's separate
*Dispatch* surface as a module) **+ a real Supabase backend**. **Still prototype-only** (not
built): the **App Khách (Customer)** and **App Tài xế (Driver)** React Native mobile apps —
their HTML prototypes in `_design_bundle/dichung-project/project/` are the source of truth if
they get built (they would use this same Supabase backend).

## Architecture

Single-page app, no router library — `src/App.jsx` is the shell (sidebar + topbar) and
holds a single `page` state string that selects one of 8 module components from the `VIEWS`
map (7 admin modules + the **Điều phối / Dispatch board**). Each module lives in `src/modules/`.
Nav items are role-gated by `ROLE_MODULES` in `App.jsx` (mock mode = admin, sees all).

The **Dispatch surface** (`modules/Dispatch.jsx`) has three views via an in-module tab toggle:
the **board** (5 KPIs, 3 columns, ⚡ Ghép ngay, **+ Khách đi ngay**), the **fleet map**
(`modules/FleetMap.jsx`), and **Phân tích / Analytics** (`modules/Analytics.jsx` — static
figures recreated from the design; production = aggregation over trips/bookings). The board is **dual-mode behind `data/useDispatchBoard.js`** (same
pattern as the store): `useMockBoard` = the simulated board from `data/dispatchBoard.js` (~7s
walk-in sim, local pooling) vs `useLiveBoard` = live trips/bookings/drivers from Postgres via
TanStack Query + a realtime channel, mutations in `lib/dispatchApi.js` (depart/complete/approve,
⚡ Ghép ngay → invoke `match-trip`, **+ Khách đi ngay** → insert an `on_demand` booking whose
INSERT trigger auto-matches). The fleet map is a **real MapLibre GL + OpenFreeMap map** (free,
no API key, lazy-loaded), real city coords, **real device GPS** via the Geolocation API
("📍 Vị trí của tôi"), and a Supabase Realtime **broadcast** channel (`fleet`) sharing
positions across devices; only the *demo fleet's* movement is simulated (no driver-app GPS
feed yet). Shared pill: `components/Pill.jsx`.

**supabase-js auth-lock gotcha:** never `await` a Supabase query directly inside
`onAuthStateChange` — it deadlocks the auth lock (symptom: stuck on "Đang tải…"). `auth.jsx`
defers `loadProfile` with `setTimeout(0)`. Dispatch inserting walk-in bookings needs the
`bookings_ops_insert`/`bookings_ops_update` RLS policies (staff), added in the rls migration.

**Shared data lives in `src/store.jsx`** — a Context (`DataProvider` / `useData`) mounted
above the shell that holds all mutable collections (drivers, corridors+surge, promos,
payouts, tickets, staff), their mutators, the topbar `query`, and a `notify(msg)` toast.
This store exists so edits survive navigation: modules unmount when you switch pages, so
if state lived in each module's `useState` it would reset on every nav.

**`DataProvider` has two implementations behind the same `useData()` API**, chosen at
runtime by `isSupabaseConfigured` (`src/lib/supabase.js`, true when `VITE_SUPABASE_*` env
vars are set):
- `MockProvider` — in-memory `useState` over the `A_*` seed arrays from `src/data/mockData.js`
  (default; lets the app run with no backend, and it's the only mode verifiable in-preview).
- `SupabaseProvider` — TanStack Query reads + write-through mutations via `src/lib/api.js`,
  which maps Postgres rows ↔ the exact mock shapes so modules stay identical. `corridors`/
  `surge` are a local mirror seeded from the query and persisted by `savePricing()` (avoids
  per-keystroke writes); other mutations write-through and invalidate.

Because both providers emit the same context shape, **modules never branch on mode.** When
adding a field/action, update both providers and (for Supabase) the mapper + a migration.

Auth (`src/lib/auth.jsx`, `useAuth`) is phone-OTP in Supabase mode and a synthetic
always-admin in mock mode; `Gate` in `src/main.jsx` shows `Login` / blocks non-staff in
Supabase mode and passes through in mock mode. The backend-as-code (schema, RLS, role→JWT
hook, seed) is in `supabase/` — see `supabase/README.md`.

The topbar search is a controlled input bound to the store's `query`; `App` passes it down
as a `query` prop only to the searchable modules (`drivers`, `promos`, `support`), which
filter their own lists. Per-page transient UI (modal open, filter tab) stays as local
`useState` in the module — only cross-navigation data goes in the store.

Modals/forms use `src/components/Modal.jsx` (`Modal`, `Field`, `Select`, `Toast`); CSV
exports use `src/utils/csv.js` (`downloadCSV`, with a UTF-8 BOM so Excel reads Vietnamese).

Layout flows top-down: `main.jsx` → `App` (shell) → one `M*` module → composed from the
shared primitives in `src/components/primitives.jsx` (`Panel`, `PageHead`, `AdBtn`, `Badge`,
`Table`/`TRow`). Icons are inline-SVG functions in `src/components/icons.jsx` (`AdIc`), called
as `AdIc.name(size)`, not components.

### Styling convention (important)

Styling is **inline `style={{}}` objects**, lifted verbatim from the design prototype to
preserve pixel fidelity. CSS in `src/styles.css` is used only for (a) design tokens — the
`:root` custom properties (`--brand`, `--ink`, `--bg`, …) are the single source of
color/shadow truth, referenced inline as `var(--token)`; and (b) the few things inline
styles can't express: media queries and keyframes. When editing UI, keep this pattern:
tokens + responsive/animation in CSS, everything else inline. Don't add a CSS framework.

**Responsive trick:** the `.split` and `.kpi-grid` classes handle column collapse, and
`.sidebar`/`.collapse-text`/`.nav-btn` handle the icon-rail collapse under 820px. Because an
inline `grid-template-columns` can't be overridden by a stylesheet media query, per-module
column ratios are passed as an inline CSS variable instead — `<div className="split"
style={{'--cols':'1.5fr 1fr'}}>` — and the media query overrides the class's
`grid-template-columns`, not the variable.

### Known paint-freeze pitfall

The sidebar active-nav highlight in `src/App.jsx` swaps `backgroundColor` between
`transparent` and a `var()` color with **no CSS transition** — browsers cannot interpolate
a `transparent ↔ var()` transition and the paint freezes. Never add a `transition` on a
background that animates between transparent and a token color (see the comment there).

## Backend

`supabase/` is backend-as-code (Supabase CLI): `migrations/` (enums + 12 tables [10 ERD core +
`staff`, `car_types`], RLS on every table incl. a `supabase_auth_admin` read-policy on
`profiles` the hook needs, a `custom_access_token_hook` that injects `profiles.role` as the
`user_role` JWT claim + `auth_role()`/`is_staff()` helpers, and a realtime publication for the
admin tables) and `seed.sql` (idempotent; mirrors the mock; seeds `auth.users` with phones so
OTP login works). Local OTP codes are fixed to `123456` via `config.toml` `[auth.sms.test_otp]`;
admin phone is `+84909000001`. See `supabase/README.md`.

Edge functions live in `supabase/functions/`. **`match-trip`** (the pooling engine) IS
implemented: the pure, unit-tested algorithm in `functions/_shared/matching.mjs` (best-fit
pooling + driver assignment + pickup sequencing) wrapped by a Deno handler `match-trip/index.ts`,
auto-invoked by a `bookings` INSERT trigger + a 1-minute `pg_cron` tick (migration
`...094000_matching.sql`). The other three (`quote-price`, `payment-webhook`, `settle-trip`)
are not implemented. Realtime publication covers the admin + matching tables; the named
channels (`trip:{id}` etc.) belong to the other surfaces. Spec: `_design_bundle/.../DiChung Backend.html`.

When changing the algorithm, edit `matching.mjs` and run its Node test
(`node --test supabase/functions/match-trip/matching.test.mjs`) — it's the only
backend logic verifiable in this environment.

## Verification

Mock mode is verifiable in the preview. The Supabase path has also been brought up and
verified on a **local stack**: the CLI is a **dev-dependency** (`npx supabase …` or the
`db:*`/`fn:serve` npm scripts — no global install), running on a Docker runtime (OrbStack
here). Gotchas learned bringing it up (all already fixed in the committed files):
- `npx supabase start` needs `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` set (dummy ok) — a provider
  must exist for phone login; `[auth.sms.test_otp]` then bypasses real SMS (codes = `123456`).
- `auth.users` seed must store phone **without** `+` and set the `*_token`/`*_change` columns
  to `''` (GoTrue scans them as non-null strings).
- The match-trip auto-trigger reads URL/key from the `app_config` table (not a DB GUC, which
  needs superuser and isn't settable on hosted) — insert the two rows once per env.

`npm run test:match` runs the matching unit tests (the one backend logic verifiable purely).

## Deployment & live environment

- **Live site:** https://dechiuinfo-lang.github.io/dichung-admin/ (GitHub Pages).
- **Repo:** `github.com/dechiuinfo-lang/dichung-admin` (public). `.github/workflows/deploy.yml`
  builds + deploys on every push to `main`. The build is **live** when the repo *Variables*
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (they are) — unset ⇒ mock. `vite base:'./'`.
- **Hosted Supabase:** project `DiChung`, ref `kximwqxdsaqijlmarohe` (Singapore, free tier).
  Provisioned end-to-end and verified: migrations pushed, `config push` enabled the auth hook +
  test-OTP, `match-trip` deployed, demo data seeded (12 users / 7 drivers / …), `app_config`
  set. Login `0909 000 001` / OTP `123456` returns a JWT with `user_role=admin`.
- **Go-live tooling:** `scripts/go-live.sh <ref>` (after `npx supabase login`) does
  link + db push + functions deploy and prints the remaining secret steps.

⚠️ **Security caveats (this is a demo/portfolio deployment):**
- The fixed **test-OTP `123456`** is a login **backdoor on a PRODUCTION project** (knowingly
  accepted for the demo) → **do not store real customer data**. To harden: remove
  `[auth.sms.test_otp]` from `config.toml`, `config push`, and configure a real SMS provider.
- The DB password used to provision the hosted DB was **pasted in chat in a prior session →
  treat as exposed; reset it** (Dashboard → Settings → Database). It isn't used at runtime
  (the app uses only the anon/publishable + service keys), so resetting is safe.
