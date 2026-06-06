-- Matching subsystem: columns the pooling algorithm needs, a route_stops chain for pickup
-- sequencing, realtime on trips/bookings, and auto-triggers (booking insert + 1-min cron)
-- that invoke the match-trip edge function.

-- ── columns for unassigned/pending bookings + sequencing ──────────────────────
alter table bookings add column route_id     text references routes (id) on delete set null;
alter table bookings add column direction    text;                      -- e.g. 'tk-dn' / 'dn-tk'
alter table bookings add column service_type service_type not null default 'ghep';
alter table bookings add column preferred_at timestamptz;               -- when the passenger wants to leave
alter table bookings add column on_demand    boolean not null default false; -- "đi ngay" instant request
alter table bookings add column pickup_order int;                       -- sequence within the trip
create index on bookings (trip_id) where trip_id is null;               -- fast "pending" scan

alter table trips add column direction text;                            -- travel way along the corridor

-- ── ordered stops along each corridor (forward direction), with km marker ──────
create table route_stops (
  route_id text not null references routes (id) on delete cascade,
  name     text not null,
  seq      int  not null,   -- order along the FORWARD direction
  km       int  not null,   -- distance from the forward origin
  primary key (route_id, name)
);
alter table route_stops enable row level security;
create policy route_stops_read  on route_stops for select using (true);
create policy route_stops_admin on route_stops for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ── realtime for the matching surfaces ────────────────────────────────────────
alter publication supabase_realtime add table trips;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table route_stops;

-- ── auto-trigger: call the match-trip edge function ───────────────────────────
-- pg_net posts asynchronously after commit; pg_cron ticks every minute (handles cutoffs and
-- bookings that arrived with no forming trip yet). The function URL + service key live in an
-- app_config table (NOT a database GUC, which needs superuser and isn't settable on hosted
-- Supabase). RLS-locked so clients can't read the secret; invoke_match_trip is SECURITY
-- DEFINER so it reads through. Set the two rows once per environment, e.g. local:
--
--   insert into app_config(key,value) values
--     ('match_trip_url','http://host.docker.internal:54321/functions/v1/match-trip'),
--     ('match_trip_key','<service_role / secret key>')
--   on conflict (key) do update set value = excluded.value;
--
-- (Hosted: https://<ref>.supabase.co/functions/v1/match-trip + the project service key.)
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table app_config (key text primary key, value text not null);
alter table app_config enable row level security;  -- no policy → clients can't read; definer fn can

create or replace function public.invoke_match_trip()
returns void
language plpgsql
security definer
as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from app_config where key = 'match_trip_url';
  select value into v_key from app_config where key = 'match_trip_key';
  if v_url is null or v_key is null then
    return; -- not configured (e.g. fresh db) → no-op instead of erroring
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := '{}'::jsonb
  );
end;
$$;

-- fire after new bookings land (statement-level: one call per insert batch)
create or replace function public.on_booking_match()
returns trigger language plpgsql as $$
begin perform public.invoke_match_trip(); return null; end;
$$;
create trigger bookings_match_after_insert
  after insert on bookings
  for each statement execute function public.on_booking_match();

-- and a steady 1-minute tick for cutoffs / leftovers
select cron.schedule('match-trip-tick', '* * * * *', $$ select public.invoke_match_trip(); $$);
