import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateUserForm from "@/components/CreateUserForm";
import { resetPassword, toggleActive } from "./actions";

export const dynamic = "force-dynamic";

const roleBadge: Record<string, string> = { admin: "badge-indigo", lead: "badge-amber", agent: "badge-slate" };
const roleLabel: Record<string, string> = { admin: "ผู้จัดการ", lead: "หัวหน้าทีม", agent: "แอดมิน" };

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/queue");

  const agents = await prisma.agent.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { assigned: true, calls: true } } },
  });

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>จัดการผู้ใช้</h1>
      <p className="page-sub" style={{ marginBottom: 22 }}>สร้างและจัดการบัญชีพนักงาน — เฉพาะผู้จัดการ</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="section-title">👤 ผู้ใช้ทั้งหมด ({agents.length})</div>
          <table>
            <thead>
              <tr><th>ชื่อ</th><th>ชื่อผู้ใช้</th><th>บทบาท</th><th style={{ textAlign: "right" }}>ลูกค้าที่ดูแล</th><th>สถานะ</th><th>จัดการ</th></tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td style={{ color: "#64748b" }}>{a.username || "—"}</td>
                  <td><span className={`badge ${roleBadge[a.role]}`}>{roleLabel[a.role]}</span></td>
                  <td style={{ textAlign: "right" }}>{a._count.assigned.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${a.isActive ? "badge-green" : "badge-red"}`}>{a.isActive ? "ใช้งาน" : "ปิด"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <form action={resetPassword} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="id" value={a.id} />
                        <input name="password" placeholder="รหัสใหม่" style={{ width: 90, padding: "5px 8px", fontSize: 12 }} />
                        <button className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }}>รีเซ็ต</button>
                      </form>
                      {a.id !== session.sub && (
                        <form action={toggleActive}>
                          <input type="hidden" name="id" value={a.id} />
                          <button className="btn btn-ghost" style={{ padding: "5px 9px", fontSize: 12 }}>{a.isActive ? "ปิด" : "เปิด"}</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CreateUserForm />
      </div>
    </div>
  );
}
