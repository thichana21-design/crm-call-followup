"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/app/users/actions";

export default function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card" style={{ padding: 20 }}>
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>➕ เพิ่มผู้ใช้ใหม่</div>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>ชื่อที่แสดง
          <input name="name" placeholder="ตั้งชื่อเอง เช่น สมชาย หรือ ทีม A" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>ชื่อผู้ใช้ (สำหรับ login)
          <input name="username" placeholder="เช่น somchai" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>รหัสผ่าน (อย่างน้อย 6 ตัว)
          <input name="password" type="text" placeholder="••••••" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>บทบาท
          <select name="role" defaultValue="agent" style={{ width: "100%", marginTop: 4 }}>
            <option value="agent">แอดมิน</option>
            <option value="lead">หัวหน้าทีม</option>
            <option value="admin">ผู้จัดการ</option>
          </select>
        </label>

        {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
        {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8 }}>เพิ่มผู้ใช้สำเร็จ</div>}

        <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center" }}>
          {pending ? "กำลังบันทึก..." : "สร้างบัญชี"}
        </button>
      </div>
    </form>
  );
}
