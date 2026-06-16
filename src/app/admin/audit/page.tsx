import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { actionLabel } from "@/lib/format";
import { formatThaiDateTime } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

// แสดง before/after เฉพาะ field ที่เปลี่ยน อ่านง่าย (ไม่ใช่ JSON ดิบ)
function renderDiff(before: any, after: any) {
  const b = (before || {}) as Record<string, any>;
  const a = (after || {}) as Record<string, any>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  if (keys.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <div style={{ display: "grid", gap: 2 }}>
      {keys.map((k) => {
        const hasBefore = k in b;
        const hasAfter = k in a;
        return (
          <div key={k} style={{ fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>{k}: </span>
            {hasBefore && <span style={{ color: "#b91c1c", textDecoration: hasAfter ? "line-through" : "none" }}>{String(b[k])}</span>}
            {hasBefore && hasAfter && <span style={{ color: "#94a3b8" }}> → </span>}
            {hasAfter && <span style={{ color: "#166534" }}>{String(a[k])}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const sp = await searchParams;
  const from = sp.from || "";
  const to = sp.to || "";
  const agentId = sp.agent ? Number(sp.agent) : undefined;
  const action = sp.action || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: any = {};
  if (agentId) where.agentId = agentId;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00+07:00`);
    if (to) where.createdAt.lt = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000);
  }

  const [agents, total, logs] = await Promise.all([
    prisma.agent.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const qs = (extra: Record<string, any>) => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (agentId) p.set("agent", String(agentId));
    if (action) p.set("action", action);
    Object.entries(extra).forEach(([k, v]) => v != null && v !== "" && p.set(k, String(v)));
    return `/admin/audit?${p.toString()}`;
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>บันทึกการตรวจสอบ (Audit Log)</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>ใครทำอะไร เมื่อไหร่ จากค่าไหนเป็นค่าไหน — เฉพาะผู้จัดการ</p>

      <form method="get" className="card" style={{ padding: 14, display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" name="from" defaultValue={from} />
        <span style={{ color: "#94a3b8" }}>→</span>
        <input type="date" name="to" defaultValue={to} />
        <select name="agent" defaultValue={agentId || ""}>
          <option value="">ทุกคน</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select name="action" defaultValue={action}>
          <option value="">ทุกการกระทำ</option>
          {Object.entries(actionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" type="submit">กรอง</button>
        <Link href="/admin/audit" className="btn btn-ghost">ล้าง</Link>
        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 14 }}>พบ {total.toLocaleString()} รายการ</span>
      </form>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>รายการ</th><th>ค่าเดิม → ค่าใหม่</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>{formatThaiDateTime(l.createdAt)}</td>
                <td>{l.agentName || "—"}</td>
                <td><span className="badge badge-indigo">{actionLabel[l.action] || l.action}</span></td>
                <td style={{ color: "#64748b" }}>
                  {l.entity}{l.entityId ? (
                    l.entity === "Customer"
                      ? <> <Link href={`/customers/${l.entityId}`} style={{ color: "#4338ca" }}>#{l.entityId}</Link></>
                      : ` #${l.entityId}`
                  ) : ""}
                </td>
                <td>{renderDiff(l.before, l.after)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีบันทึก</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", justifyContent: "center" }}>
          {page > 1 && <Link href={qs({ page: page - 1 })} className="btn btn-ghost">← ก่อนหน้า</Link>}
          <span style={{ fontSize: 14, color: "#64748b" }}>หน้า {page} / {pages}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className="btn btn-ghost">ถัดไป →</Link>}
        </div>
      )}
    </div>
  );
}
