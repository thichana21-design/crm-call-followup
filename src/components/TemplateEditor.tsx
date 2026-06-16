"use client";

import { useActionState, useRef, useState } from "react";
import { saveTemplate } from "@/app/admin/sms-templates/actions";
import { renderTemplate, SMS_VARS } from "@/lib/template";

type T = { id: number; name: string; body: string; active: boolean; sortOrder: number };

export default function TemplateEditor({ template, promo }: { template?: T; promo: string }) {
  const [state, action, pending] = useActionState(saveTemplate, null);
  const [body, setBody] = useState(template?.body || "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const editing = !!template;

  // ตัวอย่างผลลัพธ์สด ๆ (ลูกค้าเว็บมรกต)
  const preview = renderTemplate(body, { เว็บ: "มรกต", เบอร์: "0891234567", โปร: promo || "(ยังไม่ตั้งข้อความโปร)" });

  const insertVar = (v: string) => {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (el) {
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + token.length; });
    } else {
      setBody(body + token);
    }
  };

  return (
    <form action={action} className="card" style={{ padding: 22 }}>
      {editing && <input type="hidden" name="id" value={template!.id} />}
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>
        {editing ? `✏️ แก้ไข: ${template!.name}` : "➕ เพิ่ม Template ใหม่"}
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>ชื่อเรียก
          <input name="name" defaultValue={template?.name || ""} placeholder='เช่น ทวงรัก + โปร 20%' style={{ width: "100%", marginTop: 4 }} />
        </label>

        <div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>เนื้อความ — แทรกตัวแปร:
            {SMS_VARS.map((v) => (
              <button type="button" key={v} onClick={() => insertVar(v)}
                className="badge badge-indigo" style={{ marginLeft: 6, cursor: "pointer", border: "none" }}>{`{{${v}}}`}</button>
            ))}
          </div>
          <textarea ref={bodyRef} name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4}
            placeholder="สวัสดีค่ะ ลูกค้า {{เว็บ}} รับโบนัส {{โปร}} วันนี้"
            style={{ width: "100%", border: "1px solid #cdd5e1", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
        </div>

        {/* พรีวิวสด */}
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>ตัวอย่างผลลัพธ์ (ลูกค้าเว็บมรกต)</div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", fontSize: 14, minHeight: 44, whiteSpace: "pre-wrap" }}>
            {preview || <span style={{ color: "#94a3b8" }}>— พิมพ์เนื้อความด้านบน —</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="active" defaultChecked={template ? template.active : true} style={{ width: "auto" }} /> เปิดใช้งาน
          </label>
          <label style={{ fontSize: 13, color: "#475569", display: "flex", gap: 8, alignItems: "center" }}>
            ลำดับ <input name="sortOrder" type="number" defaultValue={template?.sortOrder ?? 0} style={{ width: 70 }} />
          </label>
        </div>

        {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
        {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8 }}>✓ บันทึก Template แล้ว</div>}

        <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center" }}>
          {pending ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่ม Template"}
        </button>
      </div>
    </form>
  );
}
