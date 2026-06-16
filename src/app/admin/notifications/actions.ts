"use server";

import { getSession } from "@/lib/auth";
import { setSetting } from "@/lib/sms";
import { NK, NOTIFY_TYPES, testSend } from "@/lib/notify";
import { revalidatePath } from "next/cache";

async function requireSupervisor() {
  const s = await getSession();
  if (!s || (s.role !== "lead" && s.role !== "admin")) throw new Error("ไม่มีสิทธิ์");
  return s;
}

export async function saveNotificationSettings(_prev: any, formData: FormData) {
  await requireSupervisor();
  const teamChat = String(formData.get("team_chat_id") || "").trim();
  const supChat = String(formData.get("supervisor_chat_id") || "").trim();
  const bigDeposit = String(formData.get("big_deposit_threshold") || "5000").trim();
  const minCalls = String(formData.get("min_calls_before_noon") || "30").trim();

  if (bigDeposit && isNaN(Number(bigDeposit))) return { error: "เกณฑ์ยอดฝากใหญ่ต้องเป็นตัวเลข" };
  if (minCalls && isNaN(Number(minCalls))) return { error: "เกณฑ์สายขั้นต่ำต้องเป็นตัวเลข" };

  await Promise.all([
    setSetting(NK.teamChatId, teamChat),
    setSetting(NK.supChatId, supChat),
    setSetting(NK.bigDeposit, bigDeposit || "5000"),
    setSetting(NK.minCallsAM, minCalls || "30"),
    ...NOTIFY_TYPES.map((t) => setSetting(`notify_${t.key}`, formData.get(`notify_${t.key}`) === "on" ? "on" : "off")),
  ]);

  revalidatePath("/admin/notifications");
  return { ok: true };
}

export async function testSendAction(formData: FormData) {
  await requireSupervisor();
  const group = formData.get("group") === "supervisor" ? "supervisor" : "team";
  await testSend(group);
  revalidatePath("/admin/notifications");
}
