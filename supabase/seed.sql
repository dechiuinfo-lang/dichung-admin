-- ĐiChung seed — mirrors the Admin Console mock so the app shows real data after
-- `supabase db reset`. Creates auth.users (phone) for drivers + staff so they can
-- sign in with OTP, then profiles/drivers/staff/payouts/etc. linked to them.
--
-- Local OTP: with no SMS provider, the CLI prints the code to the Inbucket inbox
-- (http://localhost:54324) — or set a fixed test OTP in config.toml.
--
-- Admin login phone (local): +84909000001  (Trần Quản Lý · role admin)

-- ── reset (idempotent: safe to re-run under `supabase db reset`) ──────────────
truncate table support_tickets, payouts, parcels, payments, bookings, trips,
  car_types, routes, drivers, staff, profiles restart identity cascade;
delete from auth.users where '+' || phone in (
  '+84909000001','+84909000002','+84909000003','+84909000004','+84909000005',
  '+84905123456','+84905678901','+84905222333','+84905444555',
  '+84905666777','+84905888999','+84905010020'
);

-- ── auth.users (phone identities) ─────────────────────────────────────────────
-- NB: GoTrue stores/looks up phone WITHOUT the leading '+', so strip it here. GoTrue also
-- scans the *_token / *_change columns as non-null strings, so seed them as '' (not NULL).
insert into auth.users (
  instance_id, id, aud, role, phone, phone_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       ltrim(phone, '+'), now(), now(), now(),
       '{"provider":"phone","providers":["phone"]}'::jsonb, '{}'::jsonb,
       '', '', '', '', '', '', '', ''
from (values
  -- staff
  ('+84909000001'), ('+84909000002'), ('+84909000003'), ('+84909000004'), ('+84909000005'),
  -- drivers
  ('+84905123456'), ('+84905678901'), ('+84905222333'), ('+84905444555'),
  ('+84905666777'), ('+84905888999'), ('+84905010020')
) as t(phone);

-- ── profiles ──────────────────────────────────────────────────────────────────
-- profiles.phone keeps the '+' (display + the drivers/staff joins below match on it).
insert into profiles (id, phone, email, full_name, role, rating)
select u.id, '+' || u.phone, x.email, x.full_name, x.role::user_role, x.rating
from (values
  ('+84909000001', 'admin@dichung.vn',     'Trần Quản Lý',   'admin',      null),
  ('+84909000002', 'ketoan@dichung.vn',    'Nguyễn Kế Toán', 'accountant', null),
  ('+84909000003', 'cskh@dichung.vn',      'Lê CSKH',        'cskh',       null),
  ('+84909000004', 'dieuphoi@dichung.vn',  'Phạm Điều Phối', 'dispatch',   null),
  ('+84909000005', 'intern@dichung.vn',    'Hoàng Thực Tập', 'cskh',       null),
  ('+84905123456', null, 'Anh Tuấn', 'driver', 4.9),
  ('+84905678901', null, 'Anh Hùng', 'driver', 4.8),
  ('+84905222333', null, 'Chị Lan',  'driver', 5.0),
  ('+84905444555', null, 'Anh Phát', 'driver', 0.0),
  ('+84905666777', null, 'Anh Kiên', 'driver', 4.7),
  ('+84905888999', null, 'Anh Sơn',  'driver', 4.6),
  ('+84905010020', null, 'Anh Bình', 'driver', 0.0)
) as x(phone, email, full_name, role, rating)
join auth.users u on u.phone = ltrim(x.phone, '+');

-- ── staff (admin-console users) ───────────────────────────────────────────────
insert into staff (profile_id, full_name, email, phone, role, perms, active)
select p.id, x.full_name, x.email, p.phone, x.role, x.perms, x.active
from (values
  ('admin@dichung.vn',    'Trần Quản Lý',   'Chủ / Quản trị', array['Toàn quyền'],            true),
  ('ketoan@dichung.vn',   'Nguyễn Kế Toán', 'Kế toán',        array['Đối soát','Báo cáo'],    true),
  ('cskh@dichung.vn',     'Lê CSKH',        'CSKH',           array['Khiếu nại','Khách hàng'],true),
  ('dieuphoi@dichung.vn', 'Phạm Điều Phối', 'Điều phối',      array['Chuyến','Tài xế'],       true),
  ('intern@dichung.vn',   'Hoàng Thực Tập', 'CSKH',           array['Khiếu nại'],             false)
) as x(email, full_name, role, perms, active)
join profiles p on p.email = x.email;

-- ── drivers ───────────────────────────────────────────────────────────────────
insert into drivers (profile_id, vehicle_model, plate, seats, kyc_status, status, rating, trips_count, joined)
select p.id, x.model, x.plate, x.seats, x.kyc::kyc_status, x.status::driver_status, x.rating, x.trips, x.joined
from (values
  ('+84905123456', 'Toyota Innova',      '92A-123.45', 7, 'verified', 'active',    4.9, 1280, '2024-08'),
  ('+84905678901', 'Toyota Vios',        '43A-678.90', 4, 'verified', 'active',    4.8,  940, '2024-11'),
  ('+84905222333', 'Ford Transit',       '92B-456.78', 9, 'verified', 'active',    5.0,  612, '2025-01'),
  ('+84905444555', 'Kia Carnival',       '92A-901.23', 7, 'review',   'pending',   0.0,    0, '2026-05'),
  ('+84905666777', 'Hyundai Custin',     '43A-222.11', 7, 'verified', 'active',    4.7,  305, '2025-06'),
  ('+84905888999', 'Mitsubishi Xpander', '92A-555.66', 7, 'verified', 'suspended', 4.6,  188, '2025-09'),
  ('+84905010020', 'Toyota Avanza',      '43A-777.88', 7, 'review',   'pending',   0.0,    0, '2026-06')
) as x(phone, model, plate, seats, kyc, status, rating, trips, joined)
join profiles p on p.phone = x.phone;

-- ── routes / car types ────────────────────────────────────────────────────────
insert into routes (id, name, corridor, origin, dest, distance_km, price_per_km, base_fee, trips_per_day, surge_mult, active) values
  ('tk-dn',     'Tam Kỳ ⇄ Đà Nẵng',         'tk-dn',     'Tam Kỳ', 'Đà Nẵng', 70,  1700, 60000, 9, 1.2, true),
  ('ha-dn-hue', 'Hội An – Đà Nẵng – Huế',   'ha-dn-hue', 'Hội An', 'Huế',     125, 1700, 60000, 7, 1.2, true);

insert into car_types (id, label, mult, base) values
  ('sedan', 'Sedan 4 chỗ',     1.00, 520000),
  ('suv',   'SUV 7 chỗ',       1.38, 720000),
  ('limo',  'Limousine 9 chỗ', 2.20, 1150000);

-- ── payouts (link by driver name) ─────────────────────────────────────────────
insert into payouts (driver_id, trips_count, gross, commission, net_amount, status)
select d.id, x.trips, x.gross, x.commission, x.net, x.status::payout_status
from (values
  ('Anh Tuấn', 24, 2880000, 432000, 2448000, 'pending'),
  ('Anh Hùng', 18, 1980000, 297000, 1683000, 'paid'),
  ('Chị Lan',  12, 1920000, 288000, 1632000, 'pending'),
  ('Anh Kiên', 15, 1650000, 247500, 1402500, 'paid')
) as x(name, trips, gross, commission, net, status)
join profiles p on p.full_name = x.name
join drivers d  on d.profile_id = p.id;

-- ── promos ────────────────────────────────────────────────────────────────────
insert into promos (code, discount_type, discount_value, cap, used, usage_limit, active, expires_at) values
  ('DICHUNG10', 'percent', 10, 30000,  412, 1000, true,  '2026-06-30'),
  ('GIAM20K',   'fixed',   20000, null, 988, 1000, true,  '2026-06-15'),
  ('CHUYENDAU', 'percent', 50, 60000, 2140, null, true,  '2026-12-31'),
  ('HE2026',    'percent', 15, 40000,    0,  500, false, '2026-08-01');

-- ── support tickets (created_at offsets → relative labels in the client) ──────
insert into support_tickets (id, user_name, issue_type, trip_label, priority, status, created_at) values
  ('C1042', 'Nguyễn Văn A', 'Tài xế đến trễ',            'TK→ĐN 07:00',  'cao',   'open',     now() - interval '12 minutes'),
  ('C1041', 'Trần Thị B',   'Hoàn tiền chậm',            'ĐN→Huế 16:00', 'trung', 'open',     now() - interval '40 minutes'),
  ('C1039', 'Lê Văn C',     'Hàng hư hỏng (gửi hàng)',   'HA→ĐN 08:30',  'cao',   'progress', now() - interval '2 hours'),
  ('C1036', 'Phạm Thị D',   'Tài xế thân thiện 👍',      'TK→ĐN 14:00',  'thấp',  'closed',   now() - interval '1 day'),
  ('C1033', 'Vũ Văn E',     'Sai địa chỉ đón',           'ĐN→TK 18:00',  'trung', 'closed',   now() - interval '1 day');

-- ── route stops (forward direction, km from origin) — for pickup sequencing ───
insert into route_stops (route_id, name, seq, km) values
  ('tk-dn', 'Tam Kỳ',    1, 0),
  ('tk-dn', 'Tam Phú',   2, 6),
  ('tk-dn', 'Núi Thành', 3, 22),
  ('tk-dn', 'Điện Bàn',  4, 48),
  ('tk-dn', 'Hải Châu',  5, 70),
  ('ha-dn-hue', 'Hội An',  1, 0),
  ('ha-dn-hue', 'Đà Nẵng', 2, 30),
  ('ha-dn-hue', 'Lăng Cô', 3, 70),
  ('ha-dn-hue', 'Huế',     4, 125);

-- ── a forming trip + unassigned paid bookings so match-trip has work to do ────
insert into trips (route_id, direction, service_type, seats_cap, depart_at, driver_id, status)
select 'tk-dn', 'tk-dn', 'ghep', 7, date_trunc('day', now()) + interval '7 hours', d.id, 'forming'
from drivers d join profiles p on p.id = d.profile_id where p.full_name = 'Anh Tuấn';

insert into bookings (route_id, direction, service_type, pax, pickup, drop_off, preferred_at, amount, status, trip_type) values
  ('tk-dn', 'tk-dn', 'ghep', 1, 'Tam Kỳ',    'Hải Châu', date_trunc('day', now()) + interval '7 hours', 120000, 'confirmed', 'one_way'),
  ('tk-dn', 'tk-dn', 'ghep', 2, 'Núi Thành', 'Hải Châu', date_trunc('day', now()) + interval '7 hours', 240000, 'confirmed', 'one_way');
