"use client";

import { useActionState, useState } from "react";
import { renderBulkMessages } from "@/app/admin/sms-templates/actions";

type Opt = { id: number; name: string };

export default function BulkSmsTool({ templates, brands }: { templates: Opt[]; brands: Opt[] }) {
  const [state, action, pending] = useActionState(renderBulkMessages, null);
  const [copied, setCopied] = useState("");

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1500); } catch {}
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form action={action} className="card" style={{ padding: 22, maxWidth: 620 }}>
        <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 14 }}>📨 สร้างข้อความหลายเบอร์</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>เลือกเทมเพลต + เว็บ แล้ววางเบอร์ (บรรทัดละเบอร์) ระบบจะแทนค่าให้ทุกเบอร์พร้อมคัดลอกทีเดียว</p>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13, color: "#475569" }}>เทมเพลต
              <select name="templateId" defaultValue="" style={{ width: "100%", marginTop: 4 }}>
                <option value="" disabled>— เลือกเทมเพลต —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: "#475569" }}>เว็บ (สำหรับ {`{{เว็บ}}`})
              <select name="brandId" defaultValue="" style={{ width: "100%", marginTop: 4 }}>
                <option value="">— ไม่ระบุ —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
          <label style={{ fontSize: 13, color: "#475569" }}>เบอร์โทร (บรรทัดละเบอร์)
            <textarea name="numbers" rows={6} placeholder={"0812345678\n0898765432\n..."}
              style={{ width: "100%", marginTop: 4, border: "1px solid #cdd5e1", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
          </label>
          {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
          <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center" }}>
            {pending ? "กำลังสร้าง..." : "สร้างข้อความ"}
          </button>
        </div>
      </form>

      {state?.ok && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>✅ ข้อความ {state.count} เบอร์</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button onClick={() => copy(state.items.map((i: any) => `${i.phone}\t${i.message}`).join("\n"), "ทั้งหมด")}
                className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }}>{copied === "ทั้งหมด" ? "✓ คัดลอกแล้ว" : "คัดลอก เบอร์+ข้อความ"}</button>
              <button onClick={() => copy(state.items.map((i: any) => i.message).join("\n"), "ข้อความ")}
                className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }}>{copied === "ข้อความ" ? "✓ คัดลอกแล้ว" : "คัดลอกเฉพาะข้อความ"}</button>
            </span>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
            <table>
              <thead><tr><th>เบอร์โทร</th><th>ข้อความ</th></tr></thead>
              <tbody>
                {state.items.map((i: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{i.phone}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{i.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
