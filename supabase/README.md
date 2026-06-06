# ĐiChung — Supabase backend

Backend-as-code for the Admin Console (and the rest of the marketplace), per
`DiChung Backend.html`. The React app runs in **mock mode** with no backend; setting the
two `VITE_SUPABASE_*` env vars switches it to this real Postgres backend.

## Layout

```
supabase/
  config.toml                      CLI config — phone OTP + custom access token hook
  migrations/
    20260602090000_schema.sql      enums + 10 tables (+ staff, car_types)
    20260602091000_auth_hook.sql   role→JWT claim hook + auth_role()/is_staff() helpers
    20260602092000_rls.sql         RLS enabled on every table, policies per role
  seed.sql                         mock-matching data (drivers, routes, promos, payouts, …)
```

## Local dev

Requires a Docker runtime (Docker Desktop / OrbStack / Colima). The CLI is a dev-dependency,
so use `npx supabase …` or the npm scripts — no global install needed.

The dummy Twilio block in `config.toml` needs an auth-token env var present at start (its
value is irrelevant locally — `test_otp` short-circuits real sending):

```bash
export SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN=local_test
npx supabase start          # boots stack, applies migrations + seed.sql; prints keys
```

Put the printed values in `.env.local` at the repo root (see `.env.example`). Recent CLI
prints a **Publishable** key (use it as the anon key) and a **Secret** key (service role):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

Enable the matching auto-trigger by inserting the function URL + Secret key into `app_config`
(once per environment). From host: `host.docker.internal` lets the DB reach the functions:

```bash
docker exec -i supabase_db_<project> psql -U postgres -d postgres -c \
 "insert into app_config(key,value) values
   ('match_trip_url','http://host.docker.internal:54321/functions/v1/match-trip'),
   ('match_trip_key','sb_secret_…')
  on conflict (key) do update set value=excluded.value;"
```

Then `npm run dev` (npm script: `db:start`/`db:reset`/`db:stop`/`fn:serve`) and log in.
**Local OTP codes** for the seeded staff are fixed to `123456` (`[auth.sms.test_otp]`):

| Phone | Role | OTP |
|---|---|---|
| `0909 000 001` (+84909000001) | admin (Trần Quản Lý) | `123456` |
| `0909 000 002` | accountant | `123456` |
| `0909 000 003` | cskh | `123456` |
| `0909 000 004` | dispatch | `123456` |

Reset DB (re-run migrations + seed): `npx supabase db reset` (re-insert `app_config` after).

## Deploy to a hosted project

**Easy path:** `npx supabase login` once, then `scripts/go-live.sh <project-ref>` from the repo
root — it runs the link + db push + function deploy below and prints the remaining secret steps.

Manual equivalent:

```bash
supabase link --project-ref <ref>
supabase db push                 # applies migrations
# seed.sql is local-only; for hosted, run it via the SQL editor or `psql` if you want demo data
```

`db push` applies only the **migrations** (which create the hook function, its GRANTs, and the
`supabase_auth_admin` RLS read-policy on `profiles`). It does **not** push `config.toml`, so on a
hosted project you must **register the hook manually**: Dashboard → Authentication → Hooks →
Customize Access Token (JWT) Claims → point at `public.custom_access_token_hook`. (Locally,
`config.toml`'s `[auth.hook.custom_access_token]` does this automatically.) Then configure a real
**SMS provider** (Twilio/Vonage/etc) under Authentication → Providers → Phone, set rate limits
under Authentication → Rate Limits, and set the app's env to the project's API URL + anon key.

`seed.sql` is local-only and not run by `db push`; run it via the SQL editor / `psql` if you want demo data.

## Role model

`profiles.role` (enum `customer/driver/dispatch/accountant/cskh/admin`) is copied into the
JWT as the `user_role` claim by `custom_access_token_hook`. RLS reads it via `auth_role()`;
back-office roles are grouped by `is_staff()`. The Admin Console requires a staff role
(`admin/accountant/dispatch/cskh`) — see the `Gate` in `src/main.jsx`.

> We use the `user_role` claim, not `role`: Supabase reserves the top-level `role` claim for
> the Postgres role. The backend doc's `auth.jwt()->>'role'` example is realized safely here.

## Matching (`match-trip`)

The pooling engine — assign each paid, unassigned booking to the best forming trip (or open a
new trip with an idle driver), sequence pickups along the corridor, and depart trips that hit
the fill threshold or the cutoff time.

- **Algorithm:** `functions/_shared/matching.mjs` — pure, deterministic, best-fit (consolidates
  into fuller trips, penalizes backtrack + time drift), with unit tests in
  `functions/match-trip/matching.test.mjs` (`node --test supabase/functions/match-trip/matching.test.mjs`).
- **On-demand "đi ngay":** a booking with `on_demand=true` is prioritized and only pools into a
  trip leaving within `onDemandSoonMin` (15m); otherwise it opens a new trip departing now.
- **Edge function:** `functions/match-trip/index.ts` (Deno) loads state, runs the algorithm with
  the service role, applies the plan. `supabase functions serve match-trip` (local) /
  `supabase functions deploy match-trip` (hosted).
- **Auto-trigger:** the matching migration adds a `bookings` INSERT trigger + a 1-minute
  `pg_cron` tick, both calling the function via `pg_net`, reading the URL + key from the
  RLS-locked `app_config` table (see the insert in "Local dev"). Verified working: inserting a
  booking → trigger → `pg_net` POST → 200, passengers pooled. (Hosted: use
  `https://<ref>.supabase.co/functions/v1/match-trip` + the project service key.)
- **Realtime:** `trips`/`bookings`/`route_stops` are published, so the customer/driver/dispatch
  apps see assignments live. Stops + a demo forming trip and pending bookings are seeded.

## Not yet wired (intentional, phase-1 scope)

- **Edge functions** `quote-price`, `payment-webhook`, `settle-trip` are documented in the
  backend doc but not implemented (`match-trip` ✅ is). The admin doesn't invoke them.
- **Adding a driver** from the admin is disabled in Supabase mode: drivers self-register via
  the driver app's KYC flow and admin *approves* them (the real phase-1 flow). Creating a
  `profiles` row needs a matching `auth.users` row, which the client can't insert directly.
- **Inviting staff** in Supabase mode inserts a `staff` row but cannot create the person's
  `auth.users`/`profiles` entry from the client, so they can't sign in until provisioned
  server-side (admin API or an edge function). The invite is admin-only in the UI.
- **Realtime:** the admin tables (drivers, routes, promos, payouts, support_tickets, staff)
  ARE subscribed via `postgres_changes` (drives the topbar indicator + live invalidation).
  The named channels (`trip:{id}`, `dispatch:board`, …) belong to the customer/driver/dispatch
  surfaces and remain out of scope here.
- **vite/esbuild** carry a dev-server-only moderate advisory; upgrading is a breaking major
  bump, deferred deliberately (no production impact — dev tooling only).
