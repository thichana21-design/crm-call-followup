import { getSetting } from "@/lib/sms";
import { sendTelegram } from "@/lib/telegram";

// คีย์ตั้งค่าใน Setting
export const NK = {
  teamChatId: "team_chat_id",
  supChatId: "supervisor_chat_id",
  bigDeposit: "big_deposit_threshold",   // ค่าเริ่ม 5000
  minCallsAM: "min_calls_before_noon",   // ค่าเริ่ม 30
} as const;

// ประเภทแจ้งเตือน (เปิด/ปิดแยกได้) — เก็บเป็น setting key "notify_<type>"
export const NOTIFY_TYPES = [
  { key: "big_deposit", label: "ยอดฝากใหญ่", group: "team" as const },
  { key: "do_not_call", label: "ตั้งห้ามโทร", group: "supervisor" as const },
  { key: "import", label: "นำเข้าไฟล์เสร็จ", group: "team" as const },
  { key: "daily", label: "สรุปรายวัน", group: "team" as const },
  { key: "weekly", label: "สรุปรายสัปดาห์", group: "supervisor" as const },
  { key: "morning_queue", label: "คิวเช้า", group: "team" as const },
  { key: "slow_day", label: "เตือนวันเงียบ", group: "supervisor" as const },
];

/** ปิดเบอร์: 0891234567 -> 089-xxx-4567 (กันข้อมูลส่วนบุคคลหลุดจากกลุ่ม) */
export function maskPhone(phone: string): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.length < 7) return "xxx";
  return `${d.slice(0, 3)}-xxx-${d.slice(-4)}`;
}

export async function isNotifyEnabled(type: string): Promise<boolean> {
  return (await getSetting(`notify_${type}`, "on")) === "on";
}

async function chatIdFor(group: "team" | "supervisor"): Promise<string> {
  return getSetting(group === "team" ? NK.teamChatId : NK.supChatId, "");
}

/** ส่งแจ้งเตือน (เช็คว่าเปิดประเภทนี้ + มี chat id ก่อน) — ส่งไม่สำเร็จไม่ทำให้งานหลักพัง */
export async function notify(opts: { type: string; group: "team" | "supervisor"; text: string }): Promise<void> {
  try {
    if (!(await isNotifyEnabled(opts.type))) return;
    const chatId = await chatIdFor(opts.group);
    if (!chatId) return;
    await sendTelegram(chatId, opts.text);
  } catch (e) {
    console.error("[notify] ส่งไม่สำเร็จ:", opts.type, e);
  }
}

/** ตรวจสิทธิ์ cron — ต้องมี header Authorization: Bearer <CRON_SECRET> */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/** ส่งเข้ากลุ่มโดยตรง (ใช้ใน cron) — เช็คเปิด/ปิดประเภทก่อน */
export async function notifyGroup(group: "team" | "supervisor", type: string, text: string): Promise<void> {
  await notify({ type, group, text });
}

/** ส่งทดสอบเข้ากลุ่ม (จากหน้า admin) */
export async function testSend(group: "team" | "supervisor"): Promise<{ ok: boolean; error?: string }> {
  const chatId = await chatIdFor(group);
  if (!chatId) return { ok: false, error: "ยังไม่ได้ตั้ง chat id ของกลุ่มนี้" };
  return sendTelegram(chatId, `✅ <b>ทดสอบการแจ้งเตือน</b>\nกลุ่ม: ${group === "team" ? "ทีม" : "หัวหน้า"}\nระบบ CRM เชื่อมต่อ Telegram เรียบร้อย`);
}
