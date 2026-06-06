// Money formatting — Vietnamese locale, e.g. 120.000đ
export const VND = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
