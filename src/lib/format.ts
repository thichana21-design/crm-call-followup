export const baht = (n: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n || 0);

export const pct = (n: number) =>
  `${((n || 0) * 100).toFixed(1)}%`;

export const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "-"; // ค่าไม่ถูกต้อง → ข้ามแบบไม่พัง
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(dt);
};

export const outcomeLabel: Record<string, string> = {
  answered: "รับสาย",
  no_answer: "ไม่รับสาย",
  unreachable: "ติดต่อไม่ได้",
  refused: "ปฏิเสธ",
};

export const statusLabel: Record<string, string> = {
  active: "ขาดฝาก",
  returned: "กลับมาฝาก",
  lost: "เลิกเล่น",
  do_not_call: "ห้ามโทร",
};

export const actionLabel: Record<string, string> = {
  "customer.status_change": "เปลี่ยนสถานะลูกค้า",
  "customer.create": "เพิ่มลูกค้า",
  "customer.bulk_import": "นำเข้าลูกค้าจากไฟล์",
  "deposit.create": "บันทึกยอดฝาก",
  "user.create": "สร้างผู้ใช้",
  "user.toggle_active": "เปิด/ปิดผู้ใช้",
  "user.reset_password": "รีเซ็ตรหัสผ่าน",
  "user.change_password": "เปลี่ยนรหัสผ่าน",
};
