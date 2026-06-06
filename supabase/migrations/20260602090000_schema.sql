-- ĐiChung — core schema (Supabase / Postgres)
-- Maps the ERD in "DiChung Backend.html": the 10 core ERD tables (+ staff, car_types
-- = 12 total) for a fixed-corridor ride-pooling & charter marketplace. Admin Console
-- reads drivers, routes, promos, payouts, support_tickets and staff; the rest exist so
-- the marketplace is complete.

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role     as enum ('customer', 'driver', 'dispatch', 'accountant', 'cskh', 'admin');
create type kyc_status    as enum ('review', 'verified', 'rejected');
create type driver_status as enum ('pending', 'active', 'suspended');
create type service_type  as enum ('ghep', 'bao');             -- pooled / whole-car charter
create type trip_status   as enum ('forming', 'enroute', 'done', 'cancelled');
create type trip_type     as enum ('one_way', 'round_trip', 'pass');
create type booking_status as enum ('pending', 'confirmed', 'done', 'cancelled');
create type pay_gateway    as enum ('wallet', 'vnpay', 'momo', 'zalopay', 'card');
create type escrow_status  as enum ('none', 'held', 'released', 'refunded');
create type parcel_size    as enum ('small', 'medium', 'large');
create type parcel_status  as enum ('pending', 'in_transit', 'delivered', 'failed');
create type payout_status  as enum ('pending', 'paid');
create type discount_type  as enum ('percent', 'fixed');
create type ticket_priority as enum ('thấp', 'trung', 'cao');
create type ticket_status   as enum ('open', 'progress', 'closed');

-- shared updated_at trigger
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ─── profiles (1:1 with auth.users) ───────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  phone         text unique,
  email         text,
  full_name     text not null,
  role          user_role not null default 'customer',
  wallet_balance bigint not null default 0,
  rating        numeric(2,1) check (rating >= 0 and rating <= 5),
  created_at    timestamptz not null default now()
);

-- staff (admin-console users): name/role label/permissions/active. Distinct from
-- customer profiles so the Phân quyền module maps 1:1. Linked to a profile if the
-- staff member also has an auth account.
create table staff (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null,
  full_name  text not null,
  email      text unique not null,
  phone      text,
  role       text not null,            -- display label: 'Chủ / Quản trị', 'Kế toán', 'CSKH', 'Điều phối'
  perms      text[] not null default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── drivers ──────────────────────────────────────────────────────────────────
create table drivers (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id) on delete cascade,
  vehicle_model text not null,
  plate         text not null,
  seats         int not null default 4,
  kyc_status    kyc_status not null default 'review',
  status        driver_status not null default 'pending',
  rating        numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  trips_count   int not null default 0,
  joined        text,                  -- yyyy-mm display label
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on drivers (status);
create trigger drivers_updated before update on drivers
  for each row execute function set_updated_at();

-- ─── routes / corridors ─────────────────────────────────────────────────────
create table routes (
  id            text primary key,      -- 'tk-dn', 'ha-dn-hue'
  name          text not null,
  corridor      text,
  origin        text,
  dest          text,
  distance_km   int not null,
  price_per_km  int not null,
  base_fee      int not null,
  trips_per_day int not null default 0,
  surge_mult    numeric(2,1) not null default 1.0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger routes_updated before update on routes
  for each row execute function set_updated_at();

-- car tiers for charter (bao xe) pricing
create table car_types (
  id    text primary key,             -- 'sedan','suv','limo'
  label text not null,
  mult  numeric(3,2) not null,
  base  int not null
);

-- ─── trips ──────────────────────────────────────────────────────────────────
create table trips (
  id           uuid primary key default gen_random_uuid(),
  driver_id    uuid references drivers (id) on delete set null,
  route_id     text references routes (id) on delete restrict,
  depart_at    timestamptz,
  service_type service_type not null default 'ghep',
  seats_cap    int not null default 4,
  status       trip_status not null default 'forming',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on trips (status);
create trigger trips_updated before update on trips
  for each row execute function set_updated_at();

-- ─── bookings ─────────────────────────────────────────────────────────────────
create table bookings (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips (id) on delete cascade,
  passenger_id uuid references profiles (id) on delete set null,
  pax          int not null default 1,
  pickup       text,
  drop_off     text,
  amount       bigint not null default 0,
  trip_type    trip_type not null default 'one_way',
  promo_code   text,
  status       booking_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index on bookings (trip_id);
create index on bookings (passenger_id);

-- ─── payments (escrow) ────────────────────────────────────────────────────────
create table payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references bookings (id) on delete cascade,
  gateway       pay_gateway not null,
  amount        bigint not null,
  escrow_status escrow_status not null default 'none',
  txn_ref       text,
  created_at    timestamptz not null default now()
);

-- ─── parcels (gửi hàng theo tuyến) ────────────────────────────────────────────
create table parcels (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid references trips (id) on delete set null,
  size       parcel_size not null default 'small',
  kind       text,
  sender     jsonb,
  receiver   jsonb,
  cod_amount bigint not null default 0,
  status     parcel_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ─── payouts (đối soát tài xế) ────────────────────────────────────────────────
create table payouts (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references drivers (id) on delete cascade,
  trips_count int not null default 0,
  gross       bigint not null default 0,
  commission  bigint not null default 0,   -- 15%
  net_amount  bigint not null default 0,
  period      daterange,
  status      payout_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on payouts (status);
create trigger payouts_updated before update on payouts
  for each row execute function set_updated_at();

-- ─── promos ───────────────────────────────────────────────────────────────────
create table promos (
  code          text primary key,
  discount_type discount_type not null,
  discount_value int not null,           -- percent (10) or fixed dong (20000)
  cap           int,                     -- max discount in dong, null = none
  used          int not null default 0,
  usage_limit   int,                     -- null = unlimited (∞)
  active        boolean not null default true,
  expires_at    date,
  created_at    timestamptz not null default now()
);

-- ─── support tickets (khiếu nại) ──────────────────────────────────────────────
create table support_tickets (
  id           text primary key,         -- 'C1042'
  passenger_id uuid references profiles (id) on delete set null,
  user_name    text not null,
  issue_type   text not null,
  trip_label   text,
  priority     ticket_priority not null default 'trung',
  status       ticket_status not null default 'open',
  created_at   timestamptz not null default now()
);
create index on support_tickets (status);
