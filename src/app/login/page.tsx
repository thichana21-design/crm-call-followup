"use client";

import { useActionState, useEffect } from "react";
import { login } from "@/app/auth-actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  useEffect(() => {
    if (state?.ok) {
      window.location.href = state.role === "agent" ? "/queue" : "/";
    }
  }, [state]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      background: "linear-gradient(135deg,#1e1b4b,#0b1220)" }}>
      <form action={formAction} style={{ width: 360, background: "#fff", borderRadius: 18, padding: 32,
        boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center",
            background: "linear-gradient(180deg,#6366f1,#4338ca)", fontSize: 21 }}>📋</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>CRM ติดตามลูกค้า</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>เข้าสู่ระบบเพื่อใช้งาน</div>
          </div>
        </div>

        <label style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>ชื่อผู้ใช้</label>
        <input name="username" autoFocus placeholder="เช่น admin" style={{ width: "100%", margin: "6px 0 14px" }} />

        <label style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>รหัสผ่าน</label>
        <input name="password" type="password" placeholder="••••••••" style={{ width: "100%", margin: "6px 0 16px" }} />

        {state?.error && (
          <div className="badge badge-red" style={{ width: "100%", justifyContent: "center", marginBottom: 14, padding: "8px" }}>
            {state.error}
          </div>
        )}

        <button type="submit" className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: 11 }}>
          {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <div style={{ marginTop: 14, textAlign: "center" }}>
          <a href="/forgot" style={{ fontSize: 13, color: "#4338ca", fontWeight: 600 }}>ลืมรหัสผ่าน?</a>
        </div>
      </form>
    </div>
  );
}
