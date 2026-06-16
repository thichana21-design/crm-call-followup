// ตัวช่วยจัดการช่วงวันที่สำหรับตัวกรอง

export type Range = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  gte?: Date;
  lt?: Date;
  label: string;
  active: boolean;
};

// วันที่แบบไทยจาก Date -> "YYYY-MM-DD" (เลื่อน +7 ชม.แล้วอ่าน UTC = เวลาไทย, ไม่ขึ้นกับ TZ เซิร์ฟเวอร์)
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => {
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

export function dayStr(d: Date) {
  return iso(d);
}

/** อ่านช่วงวันที่จาก searchParams -> ใช้กับ Prisma { gte, lt } */
export function parseRange(sp: { from?: string; to?: string }): Range {
  const from = sp.from?.trim() || undefined;
  const to = sp.to?.trim() || undefined;

  if (!from && !to) {
    return { label: "ทั้งหมด", active: false };
  }

  // ยึดขอบเขตวันตามเวลาไทย (+07:00) -> ตรงกับ timestamp ใน DB เสมอ ไม่ขึ้นกับ region เซิร์ฟเวอร์
  const gte = from ? new Date(from + "T00:00:00+07:00") : undefined;
  // lt = เที่ยงคืนวันถัดไป (เวลาไทย ไม่มี DST = +24 ชม.พอดี)
  let lt: Date | undefined;
  if (to) {
    const start = new Date(to + "T00:00:00+07:00");
    lt = new Date(start.getTime() + 24 * 3600 * 1000);
  }

  const fmt = (s?: string) =>
    s ? new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", timeZone: "Asia/Bangkok" }).format(new Date(s + "T00:00:00+07:00")) : "";
  let label = "ทั้งหมด";
  if (from && to) label = from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  else if (from) label = `ตั้งแต่ ${fmt(from)}`;
  else if (to) label = `ถึง ${fmt(to)}`;

  return { from, to, gte, lt, label, active: true };
}

/** where สำหรับ field วันที่ (calledAt / depositDate) */
export function dateWhere(r: Range): Record<string, Date> | undefined {
  if (!r.active) return undefined;
  const w: Record<string, Date> = {};
  if (r.gte) w.gte = r.gte;
  if (r.lt) w.lt = r.lt;
  return w;
}

/** ปุ่มลัด: คืน {from,to} ตามชื่อ preset อ้างอิงวันนี้จริง */
export function presets() {
  const now = new Date();
  const today = iso(now); // "วันนี้" ตามเวลาไทย
  const minus = (n: number) => iso(new Date(now.getTime() - n * 86400000));
  // เดือนปัจจุบันแบบไทย (คำนวณจากปี/เดือนของ today)
  const [Y, M] = today.split("-").map(Number); // M = 1-12
  const monthStart = `${Y}-${pad(M)}-01`;
  const lastDay = new Date(Date.UTC(Y, M, 0)).getUTCDate(); // วันสุดท้ายของเดือน M
  const monthEnd = `${Y}-${pad(M)}-${pad(lastDay)}`;
  return [
    { key: "today", label: "วันนี้", from: today, to: today },
    { key: "yesterday", label: "เมื่อวาน", from: minus(1), to: minus(1) },
    { key: "7d", label: "7 วัน", from: minus(6), to: today },
    { key: "month", label: "เดือนนี้", from: monthStart, to: monthEnd },
    { key: "all", label: "ทั้งหมด", from: "", to: "" },
  ];
}
