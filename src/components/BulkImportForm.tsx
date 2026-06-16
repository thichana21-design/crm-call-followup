"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bulkImportCustomers } from "@/app/actions";

type Opt = { id: number; name: string };

export default function BulkImportForm({ brands, agents }: { brands: Opt[]; agents: Opt[] }) {
  const [state, action, pending] = useActionState(bulkImportCustomers, null);

  return (
    <form action={action} className="card" style={{ padding: 24, maxWidth: 560 }}>
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 8 }}>📤 นำเข้าลูกค้าจากไฟล์</div>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
        รองรับ Excel (.xlsx) หรือ CSV — <b>คอลัมน์ A = เบอร์โทร</b>, คอลัมน์ B = ชื่อ (ถ้ามี). เบอร์ซ้ำจะถูกข้ามให้อัตโนมัติ
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>เว็บ/แบรนด์ (จำเป็น)
          <select name="brandId" defaultValue="" style={{ width: "100%", marginTop: 4 }}>
            <option value="" disabled>— เลือกเว็บ —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>มอบหมายให้พนักงาน (ถ้ามี)
          <select name="assignedAgentId" defaultValue="" style={{ width: "100%", marginTop: 4 }}>
            <option value="">— ไม่ระบุ —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        <label style={{ fontSize: 13, color: "#475569" }}>ไฟล์ (.xlsx หรือ .csv)
          <input name="file" type="file" accept=".xlsx,.csv,.txt" style={{ width: "100%", marginTop: 4, padding: 8 }} />
        </label>

        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>— หรือ วางเบอร์ (บรรทัดละเบอร์) —</div>
        <textarea name="pasted" rows={5} placeholder={"0812345678\n0898765432\n..."}
          style={{ width: "100%", border: "1px solid #cdd5e1", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />

        {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
        {state?.ok && (
          <div className="card" style={{ padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ fontWeight: 700, color: "#166534", marginBottom: 6 }}>✓ นำเข้าสำเร็จ {state.created.toLocaleString()} ราย</div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
              จากทั้งหมด {state.total.toLocaleString()} แถว<br />
              • เบอร์ซ้ำในไฟล์: {state.duplicateInFile.toLocaleString()}<br />
              • มีอยู่ในระบบแล้ว: {state.alreadyExisted.toLocaleString()}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn" disabled={pending} style={{ flex: 1, justifyContent: "center" }}>
            {pending ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
          </button>
          <Link href="/customers" className="btn btn-ghost" style={{ justifyContent: "center" }}>เสร็จสิ้น</Link>
        </div>
      </div>
    </form>
  );
}
