"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("ไม่มีสิทธิ์");
  return s;
}

export async function createUser(_prev: any, formData: FormData) {
  const s = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "agent");

  if (!name || !username || !password) return { error: "กรอกข้อมูลให้ครบ" };
  if (password.length < 6) return { error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
  if (!["admin", "lead", "agent"].includes(role)) return { error: "บทบาทไม่ถูกต้อง" };

  const dupName = await prisma.agent.findUnique({ where: { name } });
  if (dupName) return { error: "ชื่อนี้ถูกใช้แล้ว" };
  const dupUser = await prisma.agent.findUnique({ where: { username } });
  if (dupUser) return { error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" };

  const created = await prisma.agent.create({
    data: { name, username, role, passwordHash: hashPassword(password), isActive: true },
  });
  // ไม่เก็บรหัสผ่าน/hash ลง log
  await logAudit({
    agentId: s.sub, agentName: s.name,
    action: "user.create", entity: "Agent", entityId: created.id,
    after: { name, username, role },
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function resetPassword(formData: FormData) {
  const s = await requireAdmin();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") || "");
  if (!id || password.length < 6) return;
  await prisma.agent.update({ where: { id }, data: { passwordHash: hashPassword(password) } });
  // บันทึกแค่ "มีการรีเซ็ต" ห้ามมีค่ารหัสผ่านใด ๆ
  await logAudit({
    agentId: s.sub, agentName: s.name,
    action: "user.reset_password", entity: "Agent", entityId: id,
  });
  revalidatePath("/users");
}

export async function toggleActive(formData: FormData) {
  const s = await requireAdmin();
  const id = Number(formData.get("id"));
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return;
  await prisma.agent.update({ where: { id }, data: { isActive: !agent.isActive } });
  await logAudit({
    agentId: s.sub, agentName: s.name,
    action: "user.toggle_active", entity: "Agent", entityId: id,
    before: { isActive: agent.isActive }, after: { isActive: !agent.isActive },
  });
  revalidatePath("/users");
}
