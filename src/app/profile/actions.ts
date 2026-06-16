"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ตั้งช่องทางรับรหัสตอนลืมรหัสผ่าน (ของตัวเองเท่านั้น — อ่าน id จาก session)
export async function updateRecoveryChannels(_prev: any, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  const email = String(formData.get("email") || "").trim() || null;
  const phoneRaw = String(formData.get("phone") || "").trim();
  const phone = phoneRaw ? phoneRaw.replace(/[^\d+]/g, "") : null;
  const telegramChatId = String(formData.get("telegramChatId") || "").trim() || null;

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "อีเมลไม่ถูกต้อง" };

  await prisma.agent.update({
    where: { id: session.sub },
    data: { email, phone, telegramChatId },
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function changePassword(_prev: any, formData: FormData) {
  // อ่านผู้ใช้จาก session เท่านั้น ห้ามรับ userId จากฟอร์ม
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next || !confirm) return { error: "กรุณากรอกข้อมูลให้ครบ" };
  if (next.length < 6) return { error: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร" };
  if (next !== confirm) return { error: "รหัสผ่านใหม่กับช่องยืนยันไม่ตรงกัน" };

  const agent = await prisma.agent.findUnique({ where: { id: session.sub } });
  if (!agent || !verifyPassword(current, agent.passwordHash)) {
    return { error: "รหัสผ่านเดิมไม่ถูกต้อง" };
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: { passwordHash: hashPassword(next) },
  });

  await logAudit({
    agentId: session.sub, agentName: session.name,
    action: "user.change_password", entity: "Agent", entityId: agent.id,
  });

  return { ok: true };
}
