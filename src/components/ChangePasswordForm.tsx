"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePassword } from "@/app/profile/actions";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="card" style={{ padding: 24, maxWidth: 440 }}>
      <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>🔑 เปลี่ยนรหัสผ่าน</div>
      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ fontSize: 13, color: "#475569" }}>รหัสผ่านเดิม
          <input name="current" type="password" autoComplete="current-password" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)
          <input name="next" type="password" autoComplete="new-password" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 13, color: "#475569" }}>ยืนยันรหัสผ่านใหม่
          <input name="confirm" type="password" autoComplete="new-password" style={{ width: "100%", marginTop: 4 }} />
        </label>

        {state?.error && <div className="badge badge-red" style={{ justifyContent: "center", padding: 8 }}>{state.error}</div>}
        {state?.ok && <div className="badge badge-green" style={{ justifyContent: "center", padding: 8 }}>✓ เปลี่ยนรหัสผ่านสำเร็จ ครั้งต่อไปให้ใช้รหัสใหม่</div>}

        <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center" }}>
          {pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
        </button>
      </div>
    </form>
  );
}
