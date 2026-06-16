"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signToken, COOKIE, MAX_AGE_SECONDS } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(_prev: any, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };

  const agent = await prisma.agent.findUnique({ where: { username } });
  if (!agent || !agent.isActive || !verifyPassword(password, agent.passwordHash)) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const token = await signToken({ sub: agent.id, role: agent.role, name: agent.name });
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true, role: agent.role };
}

export async function logout() {
  const c = await cookies();
  c.delete(COOKIE);
  redirect("/login");
}
