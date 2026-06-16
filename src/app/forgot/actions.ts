"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendTelegram, isTelegramConfigured } from "@/lib/telegram";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { randomBytes } from "crypto";

// สุ่มรหัสชั่วคราวอ่านง่าย (ไม่มีอักขระสับสน)
function tempPassword(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

const GENERIC =
  "ถ้าบัญชีนี้มีอยู่และมีช่องทางรับรหัส (Telegram / อีเมล / SMS) ที่เชื่อมไว้ ระบบได้ส่งรหัสผ่านชั่วคราวไปแล้ว — ถ้าไม่ได้รับภายใน 1–2 นาที กรุณาติดต่อผู้จัดการ";

export async function requestPasswordReset(_prev: any, formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  if (!username) return { error: "กรุณากรอกชื่อผู้ใช้" };

  const agent = await prisma.agent.findUnique({ where: { username } });

  if (agent && agent.isActive) {
    // มีอย่างน้อย 1 ช่องทางที่เชื่อมไว้ + ตั้งค่า provider แล้ว จึงจะรีเซ็ต
    const canTelegram = !!agent.telegramChatId && isTelegramConfigured();
    const canEmail = !!agent.email && isEmailConfigured();
    const canSms = !!agent.phone && isSmsConfigured();

    if (canTelegram || canEmail || canSms) {
      const temp = tempPassword();
      await prisma.agent.update({
        where: { id: agent.id },
        data: { passwordHash: hashPassword(temp) },
      });

      const line = `รหัสผ่านชั่วคราวของคุณคือ: ${temp}\nกรุณาเข้าสู่ระบบด้วยรหัสนี้ แล้วเปลี่ยนรหัสผ่านใหม่ทันทีที่หน้าโปรไฟล์`;

      // ส่งทุกช่องทางที่เชื่อมไว้ (ขนานกัน)
      await Promise.allSettled([
        canTelegram
          ? sendTelegram(agent.telegramChatId!, `🔑 <b>CRM ติดตามลูกค้า</b>\nรหัสผ่านชั่วคราวของคุณคือ: <code>${temp}</code>\n\nกรุณาเข้าสู่ระบบด้วยรหัสนี้ แล้วเปลี่ยนรหัสผ่านใหม่ทันที`)
          : null,
        canEmail
          ? sendEmail(
              agent.email!,
              "รหัสผ่านชั่วคราว — CRM ติดตามลูกค้า",
              `<p>รหัสผ่านชั่วคราวของคุณคือ: <b style="font-size:18px">${temp}</b></p><p>กรุณาเข้าสู่ระบบด้วยรหัสนี้ แล้วเปลี่ยนรหัสผ่านใหม่ทันทีที่หน้าโปรไฟล์</p>`
            )
          : null,
        canSms ? sendSms(agent.phone!, `CRM: ${line}`) : null,
      ].filter(Boolean) as Promise<any>[]);
    }
  }

  // ตอบข้อความกลางๆ เสมอ กันการเดาว่ามีบัญชีนี้หรือไม่
  return { ok: true, message: GENERIC };
}
