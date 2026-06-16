"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      background: "linear-gradient(135deg,#1e1b4b,#0b1220)" }}>
      <form action={action} style={{ width: 380, background: "#fff", borderRadius: 18, padding: 32,
        boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center",
            background: "linear-gradient(180deg,#6366f1,#4338ca)", fontSize: 21 }}>🔑</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>ลืมรหัสผ่าน</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>รับรหัสชั่วคราวผ่าน Telegram</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#64748b", margin: "8px 0 18px", lineHeight: 1.6 }}>
          กรอกชื่อผู้ใช้ของคุณ ระบบจะส่งรหัสผ่านชั่วคราวไปที่ Telegram ที่คุณเชื่อมไว้ (เชื่อมได้ที่หน้าโปรไฟล์ตอนเข้าระบบปกติ)
        </p>

        {state?.ok ? (
          <div className="card" style={{ padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>✓ ส่งคำขอแล้ว</div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{state.message}</div>
          </div>
        ) : (
          <>
            <label style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>ชื่อผู้ใช้</label>
            <input name="username" autoFocus placeholder="เช่น agent1" style={{ width: "100%", margin: "6px 0 16px" }} />
            {state?.error && (
              <div className="badge badge-red" style={{ width: "100%", justifyContent: "center", marginBottom: 14, padding: 8 }}>
                {state.error}
              </div>
            )}
            <button type="submit" className="btn" disabled={pending} style={{ width: "100%", justifyContent: "center", padding: 11 }}>
              {pending ? "กำลังส่ง..." : "ส่งรหัสชั่วคราวไป Telegram"}
            </button>
          </>
        )}

        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link href="/login" style={{ fontSize: 13, color: "#4338ca", fontWeight: 600 }}>← กลับหน้าเข้าสู่ระบบ</Link>
        </div>
      </form>
    </div>
  );
}
