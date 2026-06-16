"use client";

import { useActionState } from "react";
import { updateRecoveryChannels } from "@/app/profile/actions";

export default function RecoveryChannelsForm({
  email, phone, telegramChatId,
}: { email: string | null; phone: string | null; telegramChatId: string | null }) {
  const [state, action, pending] = useActionState(updateRecoveryChannels, null);

  return (
    <form action={action} className="card" style={{ padding: 24 }}>
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 6 }}>📨 ช่องทางรับรหัส (ตอนลืมรหัสผ่าน)</div>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, lineHeight: 1.6 }}>
        เชื่อมช่องทางไว้ล่วงหน้า เวลาลืมรหัสผ่านระบบจะส่งรหัสชั่วคราวมาที่ช่องทางเหล่านี้
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>อีเมล
          <input name="email" type="email" defaultValue={email || ""} placeholder="you@example.com" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>เบอร์โทร (สำหรับ SMS)
          <input name="phone" defaultValue={phone || ""} placeholder="0812345678" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>Telegram Chat ID
          <input name="telegramChatId" defaultValue={telegramChatId || ""} placeholder="เช่น 123456789" style={{ width: "100%", marginTop: 4 }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>เปิด Telegram คุยกับ @userinfobot เพื่อดู Chat ID ของคุณ</span>
        </label>

        {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
        {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8 }}>✓ บันทึกช่องทางแล้ว</div>}

        <button type="submit" className="btn btn-ghost" disabled={pending} style={{ justifyContent: "center" }}>
          {pending ? "กำลังบันทึก..." : "บันทึกช่องทาง"}
        </button>
      </div>
    </form>
  );
}
