// ตัวช่วยเวลาโซนไทย (UTC+7, ไม่มี DST)
const TH = "+07:00";

/** แปลงค่า datetime-local ("2026-06-11T18:00") ที่เป็น "เวลาไทย" -> Date (UTC) */
export function parseThaiLocal(value: string | null | undefined): Date | null {
  const v = (value || "").trim();
  if (!v) return null;
  const withSec = v.length === 16 ? `${v}:00` : v; // เติมวินาทีถ้าไม่มี
  const d = new Date(`${withSec}${TH}`);
  return isNaN(d.getTime()) ? null : d;
}

/** สิ้นสุดวันนี้ตามเวลาไทย (= เที่ยงคืนของพรุ่งนี้เวลาไทย) เป็น Date UTC */
export function bangkokTodayEnd(now: Date = new Date()): Date {
  const thai = new Date(now.getTime() + 7 * 3600 * 1000);
  const y = thai.getUTCFullYear();
  const m = thai.getUTCMonth();
  const d = thai.getUTCDate();
  // เที่ยงคืนพรุ่งนี้ (เวลาไทย) แปลงกลับเป็น UTC
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - 7 * 3600 * 1000);
}

/** แสดงวันเวลาแบบไทย เช่น 11 มิ.ย. 2569 18:00 */
export function formatThaiDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "-"; // ค่าไม่ถูกต้อง → ข้ามแบบไม่พัง
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  }).format(dt);
}

/** ค่าเริ่มต้นของ input datetime-local จาก Date (เวลาไทย) */
export function toThaiLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const thai = new Date(d.getTime() + 7 * 3600 * 1000);
  return thai.toISOString().slice(0, 16);
}

/** วันที่วันนี้ (เวลาไทย) เป็น "YYYY-MM-DD" */
export function thaiToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** ปุ่มลัดช่วงวันที่สำหรับหน้ารายงาน (อิงเวลาไทย) */
export function reportPresets(now: Date = new Date()) {
  const today = thaiToday(now);
  const d = new Date(`${today}T00:00:00Z`); // ใช้ UTC ทำเลขวัน (date-only)
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  const addDays = (x: Date, n: number) => new Date(x.getTime() + n * 86400000);
  const dow = (d.getUTCDay() + 6) % 7; // จันทร์=0
  const monStart = addDays(d, -dow);
  const lastMonStart = addDays(monStart, -7);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  return {
    thisWeek: { label: "สัปดาห์นี้", from: fmt(monStart), to: fmt(addDays(monStart, 6)) },
    lastWeek: { label: "สัปดาห์ก่อน", from: fmt(lastMonStart), to: fmt(addDays(lastMonStart, 6)) },
    thisMonth: { label: "เดือนนี้", from: fmt(new Date(Date.UTC(y, m, 1))), to: fmt(new Date(Date.UTC(y, m + 1, 0))) },
    lastMonth: { label: "เดือนก่อน", from: fmt(new Date(Date.UTC(y, m - 1, 1))), to: fmt(new Date(Date.UTC(y, m, 0))) },
  };
}
