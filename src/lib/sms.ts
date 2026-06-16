// ส่ง SMS ผ่าน gateway ไทย — credential เก็บใน .env (ไม่ hardcode)
//
// เลือกผู้ให้บริการด้วย SMS_PROVIDER:
//   thaibulksms : ใช้ SMS_API_KEY + SMS_API_SECRET + SMS_SENDER
//   thsms       : ใช้ SMS_API_TOKEN + SMS_SENDER
//   custom      : ใช้ SMS_API_URL + SMS_API_TOKEN + SMS_SENDER (POST JSON {to,message,sender})
//
// เบอร์จะถูกแปลงเป็นรูปแบบสากล 66xxxxxxxxx อัตโนมัติ
// ดูวิธีตั้งค่าใน .env.example

import { prisma } from "@/lib/prisma";

export function isSmsConfigured() {
  const p = (process.env.SMS_PROVIDER || "").toLowerCase();
  if (p === "thaibulksms") return !!process.env.SMS_API_KEY && !!process.env.SMS_API_SECRET;
  if (p === "thsms") return !!process.env.SMS_API_TOKEN;
  if (p === "custom") return !!process.env.SMS_API_URL && !!process.env.SMS_API_TOKEN;
  // เผื่อกรณีตั้งแบบเดิม (custom โดยไม่ระบุ provider)
  return !!process.env.SMS_API_URL && !!process.env.SMS_API_TOKEN;
}

// แปลงเบอร์ไทยเป็นรูปแบบสากล 66xxxxxxxxx (ตัด 0 นำหน้า, ตัดอักขระไม่ใช่ตัวเลข)
export function toMsisdn(raw: string): string {
  let d = (raw || "").replace(/[^\d]/g, "");
  if (d.startsWith("66")) return d;
  if (d.startsWith("0")) return "66" + d.slice(1);
  return d;
}

// อ่าน/เขียนค่าตั้งค่า (เช่น ข้อความโปรปัจจุบันของ template)
export async function getSetting(key: string, def = ""): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? def;
}
export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
export const SMS_PROMO_KEY = "sms_promo";

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  if (!to) return { ok: false, error: "ไม่มีเบอร์ปลายทาง" };
  if (!isSmsConfigured()) return { ok: false, error: "ยังไม่ได้ตั้งค่า SMS gateway (ดู .env)" };

  const provider = (process.env.SMS_PROVIDER || "custom").toLowerCase();
  const sender = process.env.SMS_SENDER || "";
  const msisdn = toMsisdn(to);

  try {
    if (provider === "thaibulksms") {
      // Thaibulksms API v2 — Basic auth (key:secret), form-encoded
      const key = process.env.SMS_API_KEY!;
      const secret = process.env.SMS_API_SECRET!;
      const auth = Buffer.from(`${key}:${secret}`).toString("base64");
      const form = new URLSearchParams({ msisdn, message, force: "standard" });
      if (sender) form.set("sender", sender);
      const res = await fetch("https://api-v2.thaibulksms.com/sms", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form.toString(),
      });
      const txt = await res.text().catch(() => "");
      if (!res.ok) return { ok: false, error: txt?.slice(0, 160) || `ส่งไม่สำเร็จ (${res.status})` };
      return { ok: true };
    }

    if (provider === "thsms") {
      // THSMS API — Bearer token, JSON
      const token = process.env.SMS_API_TOKEN!;
      const res = await fetch("https://thsms.com/api/send-sms", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ to: msisdn, message, sender }),
      });
      const txt = await res.text().catch(() => "");
      if (!res.ok) return { ok: false, error: txt?.slice(0, 160) || `ส่งไม่สำเร็จ (${res.status})` };
      // THSMS อาจตอบ 200 แต่มี error ใน body
      if (/"error"\s*:\s*"[^"]/.test(txt)) return { ok: false, error: txt.slice(0, 160) };
      return { ok: true };
    }

    // custom — POST JSON {to,message,sender} + Bearer token
    const url = process.env.SMS_API_URL!;
    const token = process.env.SMS_API_TOKEN!;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: msisdn, message, sender }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: txt?.slice(0, 160) || `ส่ง SMS ไม่สำเร็จ (${res.status})` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "เชื่อมต่อบริการ SMS ไม่ได้" };
  }
}
