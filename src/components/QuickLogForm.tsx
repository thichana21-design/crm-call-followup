"use client";

import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { quickLogCall } from "@/app/actions";

type Opt = { id: number; name: string };

export default function QuickLogForm({ brands, agents, defaultBrandId }: { brands: Opt[]; agents: Opt[]; defaultBrandId?: number }) {
  const [state, action, pending] = useActionState(quickLogCall, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      // คงค่า เว็บ/วันที่/พนักงาน ไว้ ล้างเฉพาะเบอร์เพื่อกรอกรายต่อไปได้เร็ว
      const form = ref.current;
      if (form) {
        (form.elements.namedItem("phone") as HTMLInputElement).value = "";
        (form.elements.namedItem("depositAmount") as HTMLInputElement).value = "";
        (form.elements.namedItem("note") as HTMLInputElement).value = "";
        (form.elements.namedItem("phone") as HTMLInputElement).focus();
      }
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="card" style={{ padding: 24, maxWidth: 560 }}>
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>📝 ลงข้อมูลการโทร</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>เว็บ/แบรนด์
          <select name="brandId" defaultValue={defaultBrandId || ""} style={{ width: "100%", marginTop: 4 }}>
            <option value="" disabled>— เลือกเว็บ —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>วันที่โทร (เว้นว่าง = วันนี้)
          <input name="calledAt" type="date" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>เบอร์โทร
          <input name="phone" placeholder="0812345678" style={{ width: "100%", marginTop: 4 }} autoFocus />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>ผลการโทร
          <select name="outcome" defaultValue="answered" style={{ width: "100%", marginTop: 4 }}>
            <option value="answered">รับสาย</option>
            <option value="no_answer">ไม่รับสาย</option>
            <option value="unreachable">ติดต่อไม่ได้</option>
            <option value="refused">ปฏิเสธ</option>
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>พนักงาน
          <select name="agentId" style={{ width: "100%", marginTop: 4 }}>
            <option value="">— ไม่ระบุ —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>ยอดกลับมาฝาก (ถ้ามี)
          <input name="depositAmount" type="number" step="0.01" min="0" placeholder="0" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>นัดโทรอีกครั้ง (ไม่บังคับ)
          <input name="nextCallAt" type="datetime-local" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>โน้ต
          <input name="note" placeholder="บันทึกเพิ่มเติม" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "center", gridColumn: "1 / -1" }}>
          <input type="checkbox" name="smsSent" style={{ width: "auto" }} /> ส่ง SMS หลังโทร
        </label>
      </div>

      {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8, marginTop: 14 }}>{state.error}</div>}
      {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8, marginTop: 14 }}>✓ บันทึกเบอร์ {state.phone} แล้ว — กรอกรายการถัดไปได้</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="submit" className="btn" disabled={pending} style={{ flex: 1, justifyContent: "center" }}>
          {pending ? "กำลังบันทึก..." : "บันทึกและกรอกรายต่อไป"}
        </button>
        <Link href="/calls" className="btn btn-ghost" style={{ justifyContent: "center" }}>เสร็จสิ้น</Link>
      </div>
    </form>
  );
}
