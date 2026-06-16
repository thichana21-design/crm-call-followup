"use client";

import { useActionState, useState } from "react";
import { updateStatus } from "@/app/actions";

export default function StatusChangeForm({ customerId, status }: { customerId: number; status: string }) {
  const [state, action, pending] = useActionState(updateStatus, null);
  const [selected, setSelected] = useState(status);
  const needReason = selected === "do_not_call";

  return (
    <form action={action} className="card" style={{ padding: 18 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <div style={{ fontWeight: 600, marginBottom: 10 }}>เปลี่ยนสถานะ</div>
      <select name="status" defaultValue={status} onChange={(e) => setSelected(e.target.value)} style={{ width: "100%", marginBottom: 10 }}>
        <option value="active">ขาดฝาก</option>
        <option value="returned">กลับมาฝาก</option>
        <option value="lost">เลิกเล่น</option>
        <option value="do_not_call">🚫 ห้ามโทร</option>
      </select>

      <label style={{ fontSize: 13, color: "#475569" }}>
        เหตุผล {needReason && <span style={{ color: "#b91c1c" }}>(บังคับเมื่อตั้งห้ามโทร)</span>}
        <input name="reason" placeholder={needReason ? "เช่น ลูกค้าขอไม่ให้โทร" : "ระบุเหตุผล (ถ้ามี)"}
          style={{ width: "100%", marginTop: 4, marginBottom: 10, borderColor: needReason ? "#fca5a5" : undefined }} />
      </label>

      {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8, marginBottom: 10, width: "100%" }}>{state.error}</div>}
      {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8, marginBottom: 10, width: "100%" }}>✓ อัปเดตสถานะแล้ว</div>}

      <button type="submit" className="btn btn-ghost" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "กำลังบันทึก..." : "อัปเดต"}
      </button>
    </form>
  );
}
