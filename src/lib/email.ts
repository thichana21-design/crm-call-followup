// ส่งอีเมลผ่าน Resend (https://resend.com) — credential เก็บใน .env
// RESEND_API_KEY, EMAIL_FROM (เช่น "CRM <noreply@yourdomain.com>")

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "ยังไม่ได้ตั้งค่าอีเมล (RESEND_API_KEY/EMAIL_FROM)" };
  if (!to) return { ok: false, error: "ไม่มีอีเมลปลายทาง" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.message || `ส่งอีเมลไม่สำเร็จ (${res.status})` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "เชื่อมต่อบริการอีเมลไม่ได้" };
  }
}
