// Mock data for the ĐiChung admin console.
// In production these become Supabase queries (profiles, drivers, routes, promos,
// payouts, support_tickets, staff/roles) — see DiChung Backend.html.

export const A_KPI_REV = [
  { d: 'T2', v: 9.2 }, { d: 'T3', v: 11.5 }, { d: 'T4', v: 8.8 }, { d: 'T5', v: 13.1 },
  { d: 'T6', v: 16.4 }, { d: 'T7', v: 19.8 }, { d: 'CN', v: 12.6 },
];

export const A_DRIVERS = [
  { id: 'd1', name: 'Anh Tuấn', phone: '0905 123 456', model: 'Toyota Innova', plate: '92A-123.45', seats: 7, rating: 4.9, trips: 1280, status: 'active', kyc: 'verified', joined: '2024-08' },
  { id: 'd2', name: 'Anh Hùng', phone: '0905 678 901', model: 'Toyota Vios', plate: '43A-678.90', seats: 4, rating: 4.8, trips: 940, status: 'active', kyc: 'verified', joined: '2024-11' },
  { id: 'd3', name: 'Chị Lan', phone: '0905 222 333', model: 'Ford Transit', plate: '92B-456.78', seats: 9, rating: 5.0, trips: 612, status: 'active', kyc: 'verified', joined: '2025-01' },
  { id: 'd4', name: 'Anh Phát', phone: '0905 444 555', model: 'Kia Carnival', plate: '92A-901.23', seats: 7, rating: 0, trips: 0, status: 'pending', kyc: 'review', joined: '2026-05' },
  { id: 'd5', name: 'Anh Kiên', phone: '0905 666 777', model: 'Hyundai Custin', plate: '43A-222.11', seats: 7, rating: 4.7, trips: 305, status: 'active', kyc: 'verified', joined: '2025-06' },
  { id: 'd6', name: 'Anh Sơn', phone: '0905 888 999', model: 'Mitsubishi Xpander', plate: '92A-555.66', seats: 7, rating: 4.6, trips: 188, status: 'suspended', kyc: 'verified', joined: '2025-09' },
  { id: 'd7', name: 'Anh Bình', phone: '0905 010 020', model: 'Toyota Avanza', plate: '43A-777.88', seats: 7, rating: 0, trips: 0, status: 'pending', kyc: 'review', joined: '2026-06' },
];

export const A_CORRIDORS = [
  { id: 'tk-dn', name: 'Tam Kỳ ⇄ Đà Nẵng', km: 70, perKm: 1700, base: 60000, trips: 9, active: true },
  { id: 'ha-dn-hue', name: 'Hội An – Đà Nẵng – Huế', km: 125, perKm: 1700, base: 60000, trips: 7, active: true },
];

export const A_CARTYPES = [
  { id: 'sedan', label: 'Sedan 4 chỗ', mult: 1.0, base: 520000 },
  { id: 'suv', label: 'SUV 7 chỗ', mult: 1.38, base: 720000 },
  { id: 'limo', label: 'Limousine 9 chỗ', mult: 2.2, base: 1150000 },
];

export const A_PROMOS = [
  { code: 'DICHUNG10', type: '10%', cap: '30k', used: 412, limit: 1000, active: true, exp: '30/06' },
  { code: 'GIAM20K', type: '20.000đ', cap: '—', used: 988, limit: 1000, active: true, exp: '15/06' },
  { code: 'CHUYENDAU', type: '50%', cap: '60k', used: 2140, limit: '∞', active: true, exp: '31/12' },
  { code: 'HE2026', type: '15%', cap: '40k', used: 0, limit: 500, active: false, exp: '01/08' },
];

export const A_PAYOUTS = [
  { id: 'po1', driver: 'Anh Tuấn', trips: 24, gross: 2880000, commission: 432000, net: 2448000, status: 'pending' },
  { id: 'po2', driver: 'Anh Hùng', trips: 18, gross: 1980000, commission: 297000, net: 1683000, status: 'paid' },
  { id: 'po3', driver: 'Chị Lan', trips: 12, gross: 1920000, commission: 288000, net: 1632000, status: 'pending' },
  { id: 'po4', driver: 'Anh Kiên', trips: 15, gross: 1650000, commission: 247500, net: 1402500, status: 'paid' },
];

export const A_TICKETS = [
  { id: 'C1042', user: 'Nguyễn Văn A', type: 'Tài xế đến trễ', trip: 'TK→ĐN 07:00', pri: 'cao', status: 'open', time: '12 phút trước' },
  { id: 'C1041', user: 'Trần Thị B', type: 'Hoàn tiền chậm', trip: 'ĐN→Huế 16:00', pri: 'trung', status: 'open', time: '40 phút trước' },
  { id: 'C1039', user: 'Lê Văn C', type: 'Hàng hư hỏng (gửi hàng)', trip: 'HA→ĐN 08:30', pri: 'cao', status: 'progress', time: '2 giờ trước' },
  { id: 'C1036', user: 'Phạm Thị D', type: 'Tài xế thân thiện 👍', trip: 'TK→ĐN 14:00', pri: 'thấp', status: 'closed', time: 'Hôm qua' },
  { id: 'C1033', user: 'Vũ Văn E', type: 'Sai địa chỉ đón', trip: 'ĐN→TK 18:00', pri: 'trung', status: 'closed', time: 'Hôm qua' },
];

export const A_STAFF = [
  { name: 'Trần Quản Lý', email: 'admin@dichung.vn', role: 'Chủ / Quản trị', perms: ['Toàn quyền'], active: true },
  { name: 'Nguyễn Kế Toán', email: 'ketoan@dichung.vn', role: 'Kế toán', perms: ['Đối soát', 'Báo cáo'], active: true },
  { name: 'Lê CSKH', email: 'cskh@dichung.vn', role: 'CSKH', perms: ['Khiếu nại', 'Khách hàng'], active: true },
  { name: 'Phạm Điều Phối', email: 'dieuphoi@dichung.vn', role: 'Điều phối', perms: ['Chuyến', 'Tài xế'], active: true },
  { name: 'Hoàng Thực Tập', email: 'intern@dichung.vn', role: 'CSKH', perms: ['Khiếu nại'], active: false },
];

export const A_ROLES = [
  { role: 'Chủ / Quản trị', count: 1, desc: 'Toàn quyền hệ thống, tài chính, phân quyền' },
  { role: 'Kế toán', count: 1, desc: 'Đối soát, payout, doanh thu, xuất báo cáo' },
  { role: 'CSKH', count: 2, desc: 'Xử lý khiếu nại, hỗ trợ khách hàng' },
  { role: 'Điều phối', count: 3, desc: 'Ghép chuyến, theo dõi xe, duyệt tài xế' },
];
