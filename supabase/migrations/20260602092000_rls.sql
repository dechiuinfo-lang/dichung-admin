-- Row-Level Security on every table. Role comes from public.auth_role() (JWT claim).
-- Principle (per backend doc §3): customers see only their own rows; drivers see
-- their assigned work; dispatch/accountant/cskh/admin see back-office data per role.

alter table profiles        enable row level security;
alter table staff           enable row level security;
alter table drivers         enable row level security;
alter table routes          enable row level security;
alter table car_types       enable row level security;
alter table trips           enable row level security;
alter table bookings        enable row level security;
alter table payments        enable row level security;
alter table parcels         enable row level security;
alter table payouts         enable row level security;
alter table promos          enable row level security;
alter table support_tickets enable row level security;

-- ─── profiles ─────────────────────────────────────────────────────────────────
create policy profiles_self_read   on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid());
create policy profiles_staff_read  on profiles for select using (is_staff());
create policy profiles_admin_all   on profiles for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- CRITICAL: the custom_access_token_hook runs as supabase_auth_admin and SELECTs
-- profiles to build the user_role claim. RLS applies to that role too, and a GRANT
-- does NOT bypass RLS — without this policy the hook reads 0 rows and every user
-- silently defaults to 'customer', breaking all role-based access.
create policy profiles_auth_hook_read on profiles for select to supabase_auth_admin using (true);

-- ─── staff (admin console users) ──────────────────────────────────────────────
create policy staff_read      on staff for select using (is_staff());
create policy staff_admin_all on staff for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ─── drivers ──────────────────────────────────────────────────────────────────
create policy drivers_public_read on drivers for select using (status = 'active');         -- customers see active drivers
create policy drivers_self        on drivers for select using (profile_id = auth.uid());
create policy drivers_self_update on drivers for update using (profile_id = auth.uid());
create policy drivers_ops_read    on drivers for select using (is_staff());
create policy drivers_ops_write   on drivers for all    using (auth_role() in ('dispatch', 'admin')) with check (auth_role() in ('dispatch', 'admin'));

-- ─── routes / car_types (public pricing; admin writes) ───────────────────────
create policy routes_read     on routes    for select using (true);
create policy routes_admin    on routes    for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy cars_read       on car_types for select using (true);
create policy cars_admin      on car_types for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ─── trips ────────────────────────────────────────────────────────────────────
create policy trips_read        on trips for select using (true);
create policy trips_driver_upd  on trips for update using (driver_id in (select id from drivers where profile_id = auth.uid()));
create policy trips_ops_all     on trips for all    using (auth_role() in ('dispatch', 'admin')) with check (auth_role() in ('dispatch', 'admin'));

-- ─── bookings ─────────────────────────────────────────────────────────────────
create policy bookings_own    on bookings for select using (passenger_id = auth.uid());
create policy bookings_driver on bookings for select using (trip_id in (select t.id from trips t join drivers d on d.id = t.driver_id where d.profile_id = auth.uid()));
create policy bookings_ops        on bookings for select using (is_staff());
create policy bookings_insert     on bookings for insert with check (passenger_id = auth.uid());
create policy bookings_ops_insert on bookings for insert with check (is_staff());  -- dispatch books walk-ins
create policy bookings_ops_update on bookings for update using (is_staff()) with check (is_staff());

-- ─── payments (finance-sensitive) ─────────────────────────────────────────────
create policy payments_own on payments for select using (booking_id in (select id from bookings where passenger_id = auth.uid()));
create policy payments_fin on payments for select using (auth_role() in ('accountant', 'admin'));

-- ─── parcels ──────────────────────────────────────────────────────────────────
create policy parcels_ops on parcels for select using (is_staff());

-- ─── payouts ──────────────────────────────────────────────────────────────────
create policy payouts_driver on payouts for select using (driver_id in (select id from drivers where profile_id = auth.uid()));
create policy payouts_fin     on payouts for all    using (auth_role() in ('accountant', 'admin')) with check (auth_role() in ('accountant', 'admin'));

-- ─── promos (public read; admin write) ────────────────────────────────────────
create policy promos_read  on promos for select using (true);
create policy promos_admin on promos for all    using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ─── support_tickets ──────────────────────────────────────────────────────────
create policy tickets_own on support_tickets for select using (passenger_id = auth.uid());
create policy tickets_ops on support_tickets for all    using (auth_role() in ('cskh', 'admin')) with check (auth_role() in ('cskh', 'admin'));
