"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseThaiLocal } from "@/lib/dates";
import { logAudit } from "@/lib/audit";
import { notify, maskPhone, NK } from "@/lib/notify";
import { getSetting, sendSms } from "@/lib/sms";
import { revalidatePath } from "next/cache";

// ส่ง SMS จริงผ่าน gateway (เรียกจากปุ่ม "ส่ง SMS เลย")
export async function sendSmsNow(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  if (!phone || !message) return { ok: false, error: "ไม่มีเบอร์หรือข้อความ" };
  const res = await sendSms(phone, message);
  if (res.ok) {
    await logAudit({ agentId: session.sub, agentName: session.name, action: "sms.send", entity: "Customer", after: { to: maskPhone(phone) } });
  }
  return res;
}
import { redirect } from "next/navigation";

function normPhone(v: string): string {
  const digits = (v || "").replace(/\D/g, "");
  if (digits.length === 9) return "0" + digits;
  return digits;
}

// นำเข้าลูกค้าทีละมากๆ จากไฟล์ Excel/CSV หรือวางเบอร์ (บรรทัดละเบอร์)
export async function bulkImportCustomers(_prev: any, formData: FormData) {
  const brandId = Number(formData.get("brandId"));
  const assignedAgentId = formData.get("assignedAgentId") ? Number(formData.get("assignedAgentId")) : null;
  const pasted = String(formData.get("pasted") || "");
  const file = formData.get("file") as File | null;

  if (!brandId) return { error: "กรุณาเลือกเว็บ" };

  // เก็บแถว [phone, name?]
  const rows: { phone: string; name: string | null }[] = [];
  const pushRow = (rawPhone: any, rawName?: any) => {
    const phone = normPhone(String(rawPhone ?? ""));
    if (phone && phone.length >= 9) {
      const name = rawName != null && String(rawName).trim() ? String(rawName).trim() : null;
      rows.push({ phone, name });
    }
  };

  // 1) จากไฟล์
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = buf.toString("utf-8");
      for (const line of text.split(/\r?\n/)) {
        const cells = line.split(/[,\t;]/);
        if (!cells[0]) continue;
        // ข้ามหัวตารางที่ไม่ใช่ตัวเลข
        if (/[a-zA-Zก-๙]/.test(cells[0]) && !/\d/.test(cells[0])) continue;
        pushRow(cells[0], cells[1]);
      }
    } else {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf as any);
      const ws = wb.worksheets[0];
      if (ws) {
        ws.eachRow((row) => {
          const v0 = row.getCell(1).value;
          const v1 = row.getCell(2).value;
          const s0 = v0 == null ? "" : String(typeof v0 === "object" && "text" in (v0 as any) ? (v0 as any).text : v0);
          if (/[a-zA-Zก-๙]/.test(s0) && !/\d/.test(s0)) return; // header
          pushRow(s0, v1);
        });
      }
    }
  }

  // 2) จากการวางข้อความ
  if (pasted.trim()) {
    for (const line of pasted.split(/\r?\n/)) {
      const cells = line.split(/[,\t;]/);
      if (cells[0]) pushRow(cells[0], cells[1]);
    }
  }

  if (rows.length === 0) return { error: "ไม่พบเบอร์ที่ถูกต้องในไฟล์/ข้อความ" };

  // กันซ้ำในชุดเดียวกัน
  const seen = new Set<string>();
  const unique = rows.filter((r) => { if (seen.has(r.phone)) return false; seen.add(r.phone); return true; });

  // ข้ามเบอร์ที่มีอยู่แล้วในเว็บนี้
  const existing = await prisma.customer.findMany({ where: { brandId }, select: { phone: true } });
  const have = new Set(existing.map((e) => e.phone));
  const toCreate = unique.filter((r) => !have.has(r.phone));

  let created = 0;
  for (let i = 0; i < toCreate.length; i += 500) {
    const chunk = toCreate.slice(i, i + 500).map((r) => ({
      brandId, phone: r.phone, name: r.name, assignedAgentId, status: "active",
    }));
    const res = await prisma.customer.createMany({ data: chunk });
    created += res.count;
  }

  const actor = await getSession();
  await logAudit({
    agentId: actor?.sub, agentName: actor?.name,
    action: "customer.bulk_import", entity: "Brand", entityId: brandId,
    after: { brandId, assignedAgentId, total: rows.length, created, alreadyExisted: unique.length - toCreate.length },
  });
  const importBrand = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
  await notify({
    type: "import", group: "team",
    text: `📥 <b>นำเข้าลูกค้าเสร็จ</b>\nเว็บ: ${importBrand?.name || "-"}\nนำเข้าใหม่: <b>${created.toLocaleString()}</b> ราย (จาก ${rows.length.toLocaleString()})\nโดย: ${actor?.name || "-"}`,
  });

  revalidatePath("/customers");
  revalidatePath("/queue");
  return {
    ok: true,
    created,
    duplicateInFile: rows.length - unique.length,
    alreadyExisted: unique.length - toCreate.length,
    total: rows.length,
  };
}

export async function addCustomer(_prev: any, formData: FormData) {
  const brandId = Number(formData.get("brandId"));
  const phone = normPhone(String(formData.get("phone") || ""));
  const name = String(formData.get("name") || "").trim() || null;
  const assignedAgentId = formData.get("assignedAgentId") ? Number(formData.get("assignedAgentId")) : null;

  if (!brandId) return { error: "กรุณาเลือกเว็บ" };
  if (!phone || phone.length < 9) return { error: "เบอร์โทรไม่ถูกต้อง" };

  const dup = await prisma.customer.findUnique({ where: { brandId_phone: { brandId, phone } } });
  if (dup) return { error: "เบอร์นี้มีอยู่แล้วในเว็บนี้", existingId: dup.id };

  const session = await getSession();
  const c = await prisma.customer.create({
    data: { brandId, phone, name, assignedAgentId, status: "active" },
  });
  await logAudit({
    agentId: session?.sub, agentName: session?.name,
    action: "customer.create", entity: "Customer", entityId: c.id,
    after: { phone, brandId, assignedAgentId },
  });
  revalidatePath("/customers");
  revalidatePath("/queue");
  redirect(`/customers/${c.id}`);
}

// แปลงค่าวันที่จากฟอร์ม (YYYY-MM-DD) -> Date; ถ้าว่างใช้ตอนนี้
function callDate(v: FormDataEntryValue | null): { date: Date; time: string } {
  const s = String(v || "").trim();
  if (s) {
    const d = new Date(s + "T00:00:00.000Z");
    if (!isNaN(d.getTime())) return { date: d, time: "" };
  }
  const now = new Date();
  return { date: now, time: new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now) };
}

export async function logCall(formData: FormData) {
  const customerId = Number(formData.get("customerId"));
  const outcome = String(formData.get("outcome") || "no_answer");
  const smsSent = formData.get("smsSent") === "on";
  const note = String(formData.get("note") || "").trim() || null;
  const agentId = formData.get("agentId") ? Number(formData.get("agentId")) : null;
  const depositAmount = Number(formData.get("depositAmount") || 0);
  const smsTemplateId = formData.get("smsTemplateId") ? Number(formData.get("smsTemplateId")) : null;
  const { date, time } = callDate(formData.get("calledAt"));

  if (!customerId) return;

  // บังคับกฎห้ามโทรที่ระดับ action (กันยิงตรงด้วย URL/ฟอร์มเก่า)
  const target = await prisma.customer.findUnique({ where: { id: customerId }, select: { status: true, phone: true, brand: { select: { name: true } } } });
  if (!target) return;
  if (target.status === "do_not_call") {
    throw new Error("ลูกค้ารายนี้อยู่ในสถานะ “ห้ามโทร” — ไม่สามารถบันทึกการโทรได้");
  }

  // นัดโทรอีกครั้ง (เวลาไทย -> UTC) ; ถ้าไม่กรอก = ล้างนัดเดิม (ถือว่าโทรตามนัดแล้ว)
  const nextCallAt = parseThaiLocal(formData.get("nextCallAt") as string | null);

  await prisma.call.create({
    data: { customerId, calledAt: date, callTime: time || null, outcome, smsSent, note, agentId, smsTemplateId: smsSent ? smsTemplateId : null },
  });

  // ถ้ามียอดกลับมาฝาก -> บันทึก deposit + อัปเดตสถานะลูกค้า ; อัปเดตนัดเสมอ
  if (depositAmount > 0) {
    await prisma.deposit.create({
      data: { customerId, depositDate: date, loggedIn: true, amount: depositAmount },
    });
    await prisma.customer.update({ where: { id: customerId }, data: { status: "returned", nextCallAt } });
    const actor = await getSession();
    await logAudit({
      agentId: actor?.sub, agentName: actor?.name,
      action: "deposit.create", entity: "Customer", entityId: customerId,
      after: { amount: depositAmount, date: date.toISOString().slice(0, 10) },
    });
    // แจ้งเตือนยอดฝากใหญ่ (เบอร์ถูก mask เสมอ)
    const threshold = Number(await getSetting(NK.bigDeposit, "5000"));
    if (depositAmount >= threshold) {
      await notify({
        type: "big_deposit", group: "team",
        text: `💰 <b>ยอดฝากใหญ่</b>\nเว็บ: ${target.brand.name}\nเบอร์: ${maskPhone(target.phone)}\nยอด: <b>${depositAmount.toLocaleString()}</b> บาท\nบันทึกโดย: ${actor?.name || "-"}`,
      });
    }
  } else {
    await prisma.customer.update({ where: { id: customerId }, data: { nextCallAt } });
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/queue");
  revalidatePath("/calls");
  revalidatePath("/");
}

// ลงข้อมูลการโทรแบบเร็ว (ย้อนหลังได้) — ค้นเบอร์ไม่เจอจะสร้างลูกค้าใหม่ให้
export async function quickLogCall(_prev: any, formData: FormData) {
  const brandId = Number(formData.get("brandId"));
  const phone = normPhone(String(formData.get("phone") || ""));
  const outcome = String(formData.get("outcome") || "no_answer");
  const smsSent = formData.get("smsSent") === "on";
  const note = String(formData.get("note") || "").trim() || null;
  const agentId = formData.get("agentId") ? Number(formData.get("agentId")) : null;
  const depositAmount = Number(formData.get("depositAmount") || 0);
  const { date, time } = callDate(formData.get("calledAt"));

  if (!brandId) return { error: "กรุณาเลือกเว็บ" };
  if (!phone || phone.length < 9) return { error: "เบอร์โทรไม่ถูกต้อง" };

  // หา หรือ สร้างลูกค้า
  let customer = await prisma.customer.findUnique({ where: { brandId_phone: { brandId, phone } } });
  if (customer && customer.status === "do_not_call") {
    return { error: "ลูกค้ารายนี้อยู่ในสถานะ “ห้ามโทร” — ไม่สามารถบันทึกการโทรได้" };
  }
  if (!customer) {
    customer = await prisma.customer.create({
      data: { brandId, phone, assignedAgentId: agentId, status: "active" },
    });
  }

  const nextCallAt = parseThaiLocal(formData.get("nextCallAt") as string | null);

  await prisma.call.create({
    data: { customerId: customer.id, calledAt: date, callTime: time || null, outcome, smsSent, note, agentId },
  });

  if (depositAmount > 0) {
    await prisma.deposit.create({
      data: { customerId: customer.id, depositDate: date, loggedIn: true, amount: depositAmount },
    });
    await prisma.customer.update({ where: { id: customer.id }, data: { status: "returned", nextCallAt } });
    const actor = await getSession();
    await logAudit({
      agentId: actor?.sub, agentName: actor?.name,
      action: "deposit.create", entity: "Customer", entityId: customer.id,
      after: { amount: depositAmount, date: date.toISOString().slice(0, 10) },
    });
    const threshold = Number(await getSetting(NK.bigDeposit, "5000"));
    if (depositAmount >= threshold) {
      const br = await prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } });
      await notify({
        type: "big_deposit", group: "team",
        text: `💰 <b>ยอดฝากใหญ่</b>\nเว็บ: ${br?.name || "-"}\nเบอร์: ${maskPhone(phone)}\nยอด: <b>${depositAmount.toLocaleString()}</b> บาท\nบันทึกโดย: ${actor?.name || "-"}`,
      });
    }
  } else {
    await prisma.customer.update({ where: { id: customer.id }, data: { nextCallAt } });
  }

  revalidatePath("/calls");
  revalidatePath("/");
  return { ok: true, phone };
}

export async function updateStatus(_prev: any, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  const customerId = Number(formData.get("customerId"));
  const status = String(formData.get("status") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!customerId || !status) return { error: "ข้อมูลไม่ครบ" };

  // ต้องกรอกเหตุผลเสมอเมื่อตั้ง "ห้ามโทร"
  if (status === "do_not_call" && !reason) {
    return { error: "กรุณากรอกเหตุผลเมื่อตั้งสถานะห้ามโทร" };
  }

  const current = await prisma.customer.findUnique({ where: { id: customerId }, select: { status: true } });
  if (!current) return { error: "ไม่พบลูกค้า" };
  if (current.status === status) return { ok: true }; // ไม่เปลี่ยน

  await prisma.$transaction([
    prisma.customer.update({ where: { id: customerId }, data: { status } }),
    prisma.statusChangeLog.create({
      data: {
        customerId,
        fromStatus: current.status,
        toStatus: status,
        reason: reason || null,
        changedById: session.sub,
        changedByName: session.name,
      },
    }),
  ]);

  await logAudit({
    agentId: session.sub, agentName: session.name,
    action: "customer.status_change", entity: "Customer", entityId: customerId,
    before: { status: current.status }, after: { status, reason: reason || null },
  });

  // แจ้งเตือนกลุ่มหัวหน้าเมื่อตั้งห้ามโทร
  if (status === "do_not_call") {
    const cust = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true, brand: { select: { name: true } } } });
    if (cust) {
      await notify({
        type: "do_not_call", group: "supervisor",
        text: `🚫 <b>ตั้งห้ามโทร</b>\nเว็บ: ${cust.brand.name}\nเบอร์: ${maskPhone(cust.phone)}\nเหตุผล: ${reason || "-"}\nโดย: ${session.name}`,
      });
    }
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/queue");
  revalidatePath("/customers");
  return { ok: true };
}
