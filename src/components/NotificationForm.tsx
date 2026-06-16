"use client";

import { useActionState } from "react";

type Types = { key: string; label: string; group: "team" | "supervisor" }[];

export default function NotificationForm({
  values, save, testSend, types,
}: {
  values: { team: string; sup: string; big: string; minCalls: string; enabled: Record<string, boolean> };
  save: (prev: any, fd: FormData) => Promise<any>;
  testSend: (fd: FormData) => Promise<any>;
  types: Types;
}) {
  const [state, action, pending] = useActionState(save, null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
      <form action={action} className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>⚙️ ตั้งค่าทั่วไป</div>
        <div style={{ display: "grid", gap: 14 }}>
          <label style={{ fontSize: 13, color: "#475569" }}>Chat ID กลุ่มทีม
            <input name="team_chat_id" defaultValue={values.team} placeholder="เช่น -1001234567890" style={{ width: "100%", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 13, color: "#475569" }}>Chat ID กลุ่มหัวหน้า
            <input name="supervisor_chat_id" defaultValue={values.sup} placeholder="เช่น -1009876543210" style={{ width: "100%", marginTop: 4 }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>เพิ่มบอทเข้ากลุ่ม ส่งข้อความในกลุ่ม แล้วดู chat.id (เลขติดลบ) จาก getUpdates</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, color: "#475569" }}>เกณฑ์ยอดฝากใหญ่ (บาท)
              <input name="big_deposit_threshold" type="number" defaultValue={values.big} style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, color: "#475569" }}>สายขั้นต่ำก่อนเที่ยง
              <input name="min_calls_before_noon" type="number" defaultValue={values.minCalls} style={{ width: "100%", marginTop: 4 }} />
            </label>
          </div>

          <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginTop: 4 }}>เปิด/ปิดการแจ้งเตือน</div>
          <div style={{ display: "grid", gap: 8 }}>
            {types.map((t) => (
              <label key={t.key} style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name={`notify_${t.key}`} defaultChecked={values.enabled[t.key]} style={{ width: "auto" }} />
                {t.label} <span style={{ fontSize: 11, color: "#94a3b8" }}>({t.group === "team" ? "กลุ่มทีม" : "กลุ่มหัวหน้า"})</span>
              </label>
            ))}
          </div>

          {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
          {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8 }}>✓ บันทึกการตั้งค่าแล้ว</div>}
          <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center" }}>
            {pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
        </div>
      </form>

      <div className="card" style={{ padding: 22 }}>
        <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 12 }}>📤 ทดสอบส่ง</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>ส่งข้อความทดสอบไปแต่ละกลุ่ม (ต้องตั้ง Chat ID + บันทึกก่อน)</p>
        <div style={{ display: "grid", gap: 10 }}>
          <form action={testSend}>
            <input type="hidden" name="group" value="team" />
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>ทดสอบส่งกลุ่มทีม</button>
          </form>
          <form action={testSend}>
            <input type="hidden" name="group" value="supervisor" />
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>ทดสอบส่งกลุ่มหัวหน้า</button>
          </form>
        </div>
      </div>
    </div>
  );
}
