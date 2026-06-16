import { prisma } from "@/lib/prisma";
import { baht, fmtDate, outcomeLabel, statusLabel, actionLabel } from "@/lib/format";
import { formatThaiDateTime } from "@/lib/dates";
import { getSession } from "@/lib/auth";
import { getSetting, SMS_PROMO_KEY } from "@/lib/sms";
import LogCallForm from "@/components/LogCallForm";
import StatusChangeForm from "@/components/StatusChangeForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const outcomeBadge = (o: string) =>
  o === "answered" ? "badge-green" : o === "refused" ? "badge-red" : "badge-slate";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);

  const [customer, agents] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        brand: true,
        calls: { orderBy: { calledAt: "desc" }, include: { agent: true } },
        deposits: { orderBy: { depositDate: "desc" } },
        statusLogs: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.agent.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
  ]);

  if (!customer) notFound();

  // เทมเพลต SMS ที่เปิดใช้ + ข้อความโปรปัจจุบัน (สำหรับฟอร์มบันทึกสาย)
  const [smsTemplates, smsPromo] = await Promise.all([
    prisma.smsTemplate.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, name: true, body: true } }),
    getSetting(SMS_PROMO_KEY, ""),
  ]);

  // audit log ของลูกค้ารายนี้ (เฉพาะ admin ที่เห็น)
  const session = await getSession();
  const auditLogs = session?.role === "admin"
    ? await prisma.auditLog.findMany({
        where: { entity: "Customer", entityId: customerId },
        orderBy: { id: "desc" }, take: 20,
      })
    : [];

  const depositTotal = customer.deposits.reduce((a, d) => a + d.amount, 0);
  const answered = customer.calls.filter((c) => c.outcome === "answered").length;

  return (
    <div>
      <Link href="/customers" style={{ color: "#64748b", fontSize: 14 }}>← กลับรายชื่อ</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "10px 0 22px" }}>
        <h1 className="page-title" style={{ fontSize: 27 }}>{customer.phone}</h1>
        <span className={`badge ${customer.status === "returned" ? "badge-green" : (customer.status === "lost" || customer.status === "do_not_call") ? "badge-red" : "badge-amber"}`}>
          {customer.status === "do_not_call" ? "🚫 " : ""}{statusLabel[customer.status]}
        </span>
        <span className="badge badge-slate">{customer.brand.name}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 22, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20 }}>
          {/* สรุปย่อ */}
          <div style={{ display: "flex", gap: 14 }}>
            <div className="card" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>จำนวนโทร</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{customer.calls.length}</div>
            </div>
            <div className="card" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>รับสาย</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{answered}</div>
            </div>
            <div className="card" style={{ padding: 16, flex: 1 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>ยอดกลับมาฝาก</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#166534" }}>฿{baht(depositTotal)}</div>
            </div>
          </div>

          {/* ประวัติการโทร */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="section-title">📞 ประวัติการโทร</div>
            <table>
              <thead><tr><th>วันที่</th><th>เวลา</th><th>ผล</th><th>SMS</th><th>พนักงาน</th><th>โน้ต</th></tr></thead>
              <tbody>
                {customer.calls.map((c) => (
                  <tr key={c.id}>
                    <td>{fmtDate(c.calledAt)}</td>
                    <td>{c.callTime || "-"}</td>
                    <td><span className={`badge ${outcomeBadge(c.outcome)}`}>{outcomeLabel[c.outcome]}</span></td>
                    <td>{c.smsSent ? "✓" : "—"}</td>
                    <td>{c.agent?.name || "-"}</td>
                    <td style={{ color: "#64748b" }}>{c.note || "-"}</td>
                  </tr>
                ))}
                {customer.calls.length === 0 && <tr><td colSpan={6} style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>ยังไม่มีประวัติ</td></tr>}
              </tbody>
            </table>
          </div>

          {/* ประวัติการฝาก */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="section-title">💰 ประวัติกลับมาฝาก</div>
            <table>
              <thead><tr><th>วันที่</th><th>ล็อกอิน</th><th style={{ textAlign: "right" }}>ยอดฝาก</th></tr></thead>
              <tbody>
                {customer.deposits.map((d) => (
                  <tr key={d.id}>
                    <td>{fmtDate(d.depositDate)}</td>
                    <td>{d.loggedIn ? "✓" : "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>฿{baht(d.amount)}</td>
                  </tr>
                ))}
                {customer.deposits.length === 0 && <tr><td colSpan={3} style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>ยังไม่มีการฝาก</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* คอลัมน์ขวา: ฟอร์ม + สถานะ */}
        <div style={{ display: "grid", gap: 18 }}>
          {customer.nextCallAt && (() => {
            const overdue = customer.nextCallAt.getTime() < Date.now();
            return (
              <div className="card" style={{ padding: 16, background: overdue ? "#fef2f2" : "#fffbeb", border: `1px solid ${overdue ? "#fecaca" : "#fde68a"}` }}>
                <div style={{ fontWeight: 700, color: overdue ? "#b91c1c" : "#b45309" }}>
                  {overdue ? "⏰ เลยนัดโทรแล้ว" : "🔔 มีนัดโทร"}
                </div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{formatThaiDateTime(customer.nextCallAt)} น.</div>
              </div>
            );
          })()}

          {customer.status === "do_not_call" ? (
            <div className="card" style={{ padding: 18, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>🚫 ลูกค้าห้ามโทร</div>
              <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>
                ระบบปิดการบันทึกการโทรของลูกค้ารายนี้ไว้ ปลดได้โดยเปลี่ยนสถานะด้านล่าง
              </div>
            </div>
          ) : (
            <LogCallForm customerId={customer.id} agents={agents}
              templates={smsTemplates} promo={smsPromo}
              smsContext={{ เว็บ: customer.brand.name, เบอร์: customer.phone }} />
          )}

          <StatusChangeForm customerId={customer.id} status={customer.status} />

          {/* ประวัติการเปลี่ยนสถานะ */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="section-title" style={{ fontSize: 14 }}>🕓 ประวัติเปลี่ยนสถานะ</div>
            <div style={{ padding: customer.statusLogs.length ? 0 : 16 }}>
              {customer.statusLogs.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>ยังไม่มีการเปลี่ยนสถานะ</div>
              ) : (
                <div style={{ display: "grid" }}>
                  {customer.statusLogs.map((l) => (
                    <div key={l.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>
                        {statusLabel[l.fromStatus] || l.fromStatus} → {statusLabel[l.toStatus] || l.toStatus}
                      </div>
                      <div style={{ color: "#64748b", marginTop: 2 }}>
                        {l.changedByName || "—"} · {fmtDate(l.createdAt)}
                      </div>
                      {l.reason && <div style={{ color: "#475569", marginTop: 2 }}>เหตุผล: {l.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* บันทึกการตรวจสอบของลูกค้ารายนี้ (เฉพาะ admin) */}
          {session?.role === "admin" && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="section-title" style={{ fontSize: 14 }}>🔍 บันทึกการตรวจสอบ</div>
              <div style={{ padding: auditLogs.length ? 0 : 16 }}>
                {auditLogs.length === 0 ? (
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>ยังไม่มีบันทึก</div>
                ) : (
                  <div style={{ display: "grid" }}>
                    {auditLogs.map((l) => (
                      <div key={l.id} style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{actionLabel[l.action] || l.action}</div>
                        <div style={{ color: "#64748b", marginTop: 2 }}>{l.agentName || "—"} · {formatThaiDateTime(l.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
