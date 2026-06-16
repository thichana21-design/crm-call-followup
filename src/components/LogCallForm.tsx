"use client";

import { useState } from "react";
import { logCall } from "@/app/actions";
import { renderTemplate } from "@/lib/template";

type Tpl = { id: number; name: string; body: string };

export default function LogCallForm({
  customerId, agents, templates = [], smsContext, promo = "",
}: {
  customerId: number;
  agents: { id: number; name: string }[];
  templates?: Tpl[];
  smsContext?: { เว็บ: string; เบอร์: string };
  promo?: string;
}) {
  const [smsSent, setSmsSent] = useState(false);
  const [tplId, setTplId] = useState<number | "">("");
  const [copied, setCopied] = useState(false);

  const phone = smsContext?.เบอร์ || "";

  const selected = templates.find((t) => t.id === tplId);
  const rendered = selected
    ? renderTemplate(selected.body, { เว็บ: smsContext?.เว็บ || "", เบอร์: smsContext?.เบอร์ || "", โปร: promo })
    : "";

  const copy = async () => {
    if (!rendered) return;
    try {
      await navigator.clipboard.writeText(rendered);
      setCopied(true);
      setSmsSent(true); // คัดลอกแล้วถือว่าจะส่ง SMS -> ติ๊กอัตโนมัติ
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <form action={logCall} className="card" style={{ padding: 18 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="smsTemplateId" value={tplId || ""} />
      <div style={{ fontWeight: 600, marginBottom: 14 }}>📞 บันทึกการโทร</div>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>
          วันที่โทร (เว้นว่าง = วันนี้)
          <input name="calledAt" type="date" style={{ width: "100%", marginTop: 4 }} />
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>
          ผลการโทร
          <select name="outcome" style={{ width: "100%", marginTop: 4 }} defaultValue="answered">
            <option value="answered">รับสาย</option>
            <option value="no_answer">ไม่รับสาย</option>
            <option value="unreachable">ติดต่อไม่ได้</option>
            <option value="refused">ปฏิเสธ</option>
          </select>
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>
          พนักงาน
          <select name="agentId" style={{ width: "100%", marginTop: 4 }}>
            <option value="">— ไม่ระบุ —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>
          ยอดกลับมาฝาก (บาท) — ใส่ถ้ามี
          <input name="depositAmount" type="number" step="0.01" min="0" placeholder="0" style={{ width: "100%", marginTop: 4 }} />
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>
          นัดโทรอีกครั้ง (ไม่บังคับ)
          <input name="nextCallAt" type="datetime-local" style={{ width: "100%", marginTop: 4 }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>ใส่แล้วลูกค้าจะกลับเข้าคิว “ถึงนัด” ตามวันเวลานี้</span>
        </label>

        {/* ส่ง SMS จาก template */}
        {templates.length > 0 && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, color: "#475569", fontWeight: 600, marginBottom: 2 }}>💬 เตรียมข้อความ SMS</div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 8 }}>คัดลอกข้อความแล้วนำไปส่งเองผ่านแอป SMS/มือถือ (ระบบไม่ได้ส่งให้อัตโนมัติ)</div>
            <select value={tplId} onChange={(e) => { setTplId(e.target.value ? Number(e.target.value) : ""); setCopied(false); }} style={{ width: "100%" }}>
              <option value="">— เลือกข้อความ —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selected && (
              <>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 14, marginTop: 8, whiteSpace: "pre-wrap" }}>{rendered}</div>
                <button type="button" onClick={copy} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                  {copied ? "✓ คัดลอกแล้ว — นำไปวางในแอป SMS ได้เลย" : "📋 คัดลอกข้อความไปส่งเอง"}
                </button>
                {phone && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>เบอร์ลูกค้า: {phone}</div>}
              </>
            )}
          </div>
        )}

        <label style={{ fontSize: 13, color: "#475569" }}>
          โน้ต
          <input name="note" placeholder="บันทึกเพิ่มเติม" style={{ width: "100%", marginTop: 4 }} />
        </label>

        <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="smsSent" checked={smsSent} onChange={(e) => setSmsSent(e.target.checked)} style={{ width: "auto" }} /> ส่ง SMS ให้ลูกค้าแล้ว (บันทึกไว้เป็นสถิติ)
        </label>

        <button type="submit" className="btn">บันทึกการโทร</button>
      </div>
    </form>
  );
}
