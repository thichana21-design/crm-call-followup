import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import RecoveryChannelsForm from "@/components/RecoveryChannelsForm";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้จัดการ",
  lead: "หัวหน้าทีม",
  agent: "แอดมิน",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const agent = await prisma.agent.findUnique({ where: { id: session.sub } });
  if (!agent) redirect("/login");

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>โปรไฟล์ของฉัน</h1>
      <p className="page-sub" style={{ marginBottom: 22 }}>ดูข้อมูลบัญชีและเปลี่ยนรหัสผ่านของตัวเอง</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start", maxWidth: 920 }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 16 }}>👤 ข้อมูลบัญชี</div>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>ชื่อแสดง</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>ชื่อผู้ใช้</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{agent.username || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>บทบาท</div>
              <div style={{ marginTop: 2 }}>
                <span className="badge badge-indigo">{ROLE_LABELS[agent.role] || agent.role}</span>
              </div>
            </div>
          </div>
        </div>

        <ChangePasswordForm />

        <RecoveryChannelsForm email={agent.email} phone={agent.phone} telegramChatId={agent.telegramChatId} />
      </div>
    </div>
  );
}
