"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addCustomer } from "@/app/actions";

type Opt = { id: number; name: string };

export default function AddCustomerForm({ brands, agents }: { brands: Opt[]; agents: Opt[] }) {
  const [state, action, pending] = useActionState(addCustomer, null);

  return (
    <form action={action} className="card" style={{ padding: 24, maxWidth: 460 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="section-title" style={{ padding: 0, border: "none" }}>➕ เพิ่มลูกค้าใหม่</div>
        <Link href="/customers/import" style={{ fontSize: 13, color: "#0284c7", fontWeight: 600 }}>📤 เพิ่มทีละหลายราย (ไฟล์)</Link>
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>เว็บ/แบรนด์
          <select name="brandId" style={{ width: "100%", marginTop: 4 }} defaultValue="">
            <option value="" disabled>— เลือกเว็บ —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>เบอร์โทร
          <input name="phone" placeholder="0812345678" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>ชื่อ (ถ้ามี)
          <input name="name" placeholder="ชื่อลูกค้า" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>มอบหมายให้พนักงาน (ถ้ามี)
          <select name="assignedAgentId" style={{ width: "100%", marginTop: 4 }}>
            <option value="">— ไม่ระบุ —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {state?.error && (
          <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>
            {state.error}
            {state.existingId && <Link href={`/customers/${state.existingId}`} style={{ marginLeft: 8, textDecoration: "underline" }}>ดูลูกค้า</Link>}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn" disabled={pending} style={{ flex: 1, justifyContent: "center" }}>
            {pending ? "กำลังบันทึก..." : "บันทึกลูกค้า"}
          </button>
          <Link href="/customers" className="btn btn-ghost" style={{ justifyContent: "center" }}>ยกเลิก</Link>
        </div>
      </div>
    </form>
  );
}
