# ĐiChung — Admin Console

Production React (Vite) recreation of the `DiChung Admin.html` design prototype —
the desktop admin console for quản trị / kế toán / CSKH of the ĐiChung intercity
ride-pooling & charter marketplace (corridors Tam Kỳ ⇄ Đà Nẵng and Hội An – Đà Nẵng – Huế).

**Live demo (mock mode):** https://dechiuinfo-lang.github.io/dichung-admin/ — auto-deployed
to GitHub Pages from `main` (`.github/workflows/deploy.yml`); no backend, so it runs on mock
data. The fleet map there is a real **MapLibre + OpenFreeMap** map (no API key) with live
**device GPS** via the browser Geolocation API.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## Two modes: mock & Supabase

The app runs against **mock data by default** (no backend, no login) so it always boots for
demos. Setting `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (see `.env.example`) switches it
to a real **Supabase** backend: phone-OTP login, role-gated access, and live Postgres data via
TanStack Query. The data-source switch lives in [src/store.jsx](src/store.jsx); both modes
expose the identical `useData()` API so the modules are unchanged.

Backend-as-code (schema, RLS, role-in-JWT auth hook, seed) is in [supabase/](supabase/) —
see [supabase/README.md](supabase/README.md) for `supabase start` / `db push` and the local
login credentials.

## What's implemented

The 7 admin modules, the sidebar + topbar shell, and the shared design system,
lifted faithfully (tokens, copy, spacing, icons, interaction logic) from the prototype:

| Module | File | Notes |
|---|---|---|
| Tổng quan | `src/modules/Overview.jsx` | 4 KPIs, 7-day revenue bar chart, activity feed |
| Điều phối | `src/modules/Dispatch.jsx` | board (live trips/pending/fleet from Postgres in Supabase mode, simulated in mock; ⚡ Ghép ngay, + Khách đi ngay) + fleet map (`FleetMap.jsx`) |
| Tài xế | `src/modules/Drivers.jsx` | status filter tabs, approve KYC / suspend / unsuspend |
| Bảng giá & Tuyến | `src/modules/Pricing.jsx` | editable price/km, surge slider, corridor toggle, car types |
| Khuyến mãi | `src/modules/Promos.jsx` | promo table, usage progress, active toggle |
| Đối soát tài chính | `src/modules/Finance.jsx` | 4 stat cards, per-driver payout with pay action |
| Khiếu nại | `src/modules/Support.jsx` | tickets by priority, advance status |
| Phân quyền | `src/modules/Staff.jsx` | staff list + role cards, enable/disable |

Shared pieces:
- `src/store.jsx` — app-wide data store (`DataProvider` / `useData`): mutable collections,
  topbar search query, and toast. Edits survive navigation between modules.
- `src/styles.css` — design tokens (`:root`) + responsive classes + animations.
- `src/components/primitives.jsx` — `Badge`, `Panel`, `PageHead`, `AdBtn`, `Table`, `TRow`.
- `src/components/Modal.jsx` — `Modal`, `Field`, `Select`, `Toast`.
- `src/components/icons.jsx` — custom stroked line icon set (`AdIc`). Swappable for Lucide.
- `src/components/Mark.jsx` — the "Đi" gradient brand mark.
- `src/utils/csv.js` — client-side CSV/Excel export.
- `src/data/mockData.js` — seed data. In production these become Supabase queries.

## Interactive features (mock)

All previously-decorative controls are wired:
- **State persists across navigation** (via the Context store) — approve a driver, toggle a
  promo, pay a payout, then switch pages and back: changes stick.
- **Add forms** — "+ Thêm tài xế", "+ Tạo mã mới", "+ Mời nhân viên" open validating modals.
- **Export** — "Xuất báo cáo" (Overview) and "Xuất Excel" (Finance) download real CSV files.
- **Search** — the topbar search filters the Tài xế / Khuyến mãi / Khiếu nại tables live.
- **Filters** — status tabs on Tài xế and Khiếu nại.
- **Toasts** confirm every mutation; actions like Lưu thay đổi give feedback.
- **Responsive** — KPI/split grids collapse and the sidebar becomes an icon rail on narrow
  viewports.

The "Phí tối thiểu" pricing field now applies as a real floor on the fare estimate
(`max(km × perKm, base)`), and approving a driver no longer assigns a fake 5.0 rating.

## Deviations from the prototype (intentional)

- **Browser-window frame dropped.** The prototype wrapped the app in a fake Chrome
  window (`frames/`); the handoff README marks that as presentation-only — this app
  fills the viewport instead.
- **Launcher link dropped** (the "← Hệ sinh thái" pill pointed at the prototype launcher).
- **Real React project** (ES modules, Vite, `useState`) instead of inline Babel + `window` globals.

## Known pitfall preserved

The sidebar active highlight swaps `backgroundColor` between `transparent` and a
`var()` color with **no CSS transition** — transitioning that pair freezes the paint
in browsers. See the comment in `src/App.jsx`.

## Production backend (built — Supabase)

The Supabase path is built: schema for all 12 tables (10 ERD core + `staff`, `car_types`) +
RLS on every table + a role-in-JWT auth hook ([supabase/](supabase/)), phone-OTP login with
role gating, and a TanStack Query data layer with live realtime invalidation
([src/lib/api.js](src/lib/api.js), [src/lib/auth.jsx](src/lib/auth.jsx)) that maps DB rows to
the module shapes. Point the app at a project via env vars and it goes live. See
[supabase/README.md](supabase/README.md).

> ✅ **Verification status:** verified against a live local stack (`npx supabase start` on
> OrbStack) — migrations + seed apply, phone-OTP login works, role lands in the JWT, RLS
> reads are role-correct, and the `match-trip` engine pools real bookings both on manual
> invoke and via the auto-trigger. Setup details (incl. the `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN`
> env + `app_config` rows) are in [supabase/README.md](supabase/README.md).

Remaining (phase-1 scope notes in `supabase/README.md`): `match-trip` is implemented
(pooling engine + auto-trigger); `quote-price`/`payment-webhook`/`settle-trip` are documented
but not built; manual "add driver" is disabled in Supabase mode (drivers self-onboard via KYC).

## Deploy

- **Frontend → GitHub Pages** (mock mode, no backend): pushing `main` runs
  `.github/workflows/deploy.yml` (build → Pages). Live at the URL up top. Vite `base: './'`
  makes assets work under the `/dichung-admin/` subpath.
- **Go live with a real backend:** after a one-time `npx supabase login`, run
  **`scripts/go-live.sh <project-ref>`** — it links the project, pushes migrations, and deploys
  the `match-trip` function, then prints the 3 secret-dependent steps (enable the access-token
  hook + an SMS provider; insert the `app_config` rows; set the GitHub repo *Variables*
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — the deploy workflow already reads them, so
  the next push builds a live Pages site). See [supabase/README.md](supabase/README.md).
