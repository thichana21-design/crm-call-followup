"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { setSetting, getSetting, SMS_PROMO_KEY } from "@/lib/sms";
import { renderTemplate } from "@/lib/template";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function normPhone(v: string): string {
  const d = (v || "").replace(/\D/g, "");
  return d.length === 9 ? "0" + d : d;
}

// สร้างข้อความจาก template แทนค่าให้หลายเบอร์พร้อมกัน
export async function renderBulkMessages(_prev: any, formData: FormData) {
  await requireSupervisor();
  const templateId = Number(formData.get("templateId"));
  const brandId = formData.get("brandId") ? Number(formData.get("brandId")) : 0;
  const numbersText = String(formData.get("numbers") || "");

  if (!templateId) return { error: "กรุณาเลือกเทมเพลต" };
  const tpl = await prisma.smsTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) return { error: "ไม่พบเทมเพลต" };

  const brand = brandId ? await prisma.brand.findUnique({ where: { id: brandId } }) : null;
  const promo = await getSetting(SMS_PROMO_KEY, "");

  const nums = [...new Set(numbersText.split(/[\s,;]+/).map(normPhone).filter((n) => n.length >= 9))];
  if (!nums.length) return { error: "ไม่พบเบอร์ที่ถูกต้อง (วางเบอร์ บรรทัดละเบอร์)" };

  const items = nums.map((phone) => ({
    phone,
    message: renderTemplate(tpl.body, { เว็บ: brand?.name || "", เบอร์: phone, โปร: promo }),
  }));
  return { ok: true, items, count: items.length };
}

async function requireSupervisor() {
  const s = await getSession();
  if (!s || (s.role !== "lead" && s.role !== "admin")) throw new Error("ไม่มีสิทธิ์");
  return s;
}

export async function saveTemplate(_prev: any, formData: FormData) {
  const s = await requireSupervisor();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const active = formData.get("active") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!name || !body) return { error: "กรุณากรอกชื่อและเนื้อความ" };

  if (id) {
    await prisma.smsTemplate.update({ where: { id }, data: { name, body, active, sortOrder } });
    await logAudit({ agentId: s.sub, agentName: s.name, action: "sms_template.update", entity: "SmsTemplate", entityId: id, after: { name, active } });
  } else {
    const t = await prisma.smsTemplate.create({ data: { name, body, active, sortOrder } });
    await logAudit({ agentId: s.sub, agentName: s.name, action: "sms_template.create", entity: "SmsTemplate", entityId: t.id, after: { name } });
  }
  revalidatePath("/admin/sms-templates");
  return { ok: true };
}

export async function toggleTemplate(formData: FormData) {
  const s = await requireSupervisor();
  const id = Number(formData.get("id"));
  const t = await prisma.smsTemplate.findUnique({ where: { id } });
  if (!t) return;
  await prisma.smsTemplate.update({ where: { id }, data: { active: !t.active } });
  await logAudit({ agentId: s.sub, agentName: s.name, action: "sms_template.toggle", entity: "SmsTemplate", entityId: id, before: { active: t.active }, after: { active: !t.active } });
  revalidatePath("/admin/sms-templates");
}

export async function savePromo(formData: FormData) {
  await requireSupervisor();
  const promo = String(formData.get("promo") || "").trim();
  await setSetting(SMS_PROMO_KEY, promo);
  revalidatePath("/admin/sms-templates");
}
