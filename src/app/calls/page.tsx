import { prisma } from "@/lib/prisma";
import { baht, fmtDate, outcomeLabel } from "@/lib/format";
import { parseRange, dateWhere } from "@/lib/date";
import { getSession } from "@/lib/auth";
import DateRangeFilter from "@/components/DateRangeFilter";
import Pagination from "@/components/Pagination";
import Link from "next/link";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

const outcomeBadge = (o: string) =>
  o === "answered" ? "badge-green" : o === "refused" ? "badge-red" : "badge-slate";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; brand?: string; outcome?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const range = parseRange(sp);
  const brandId = sp.brand ? Number(sp.brand) : undefined;
  const outcome = sp.outcome || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: any = {};
  const dc = dateWhere(range);
  if (dc) where.calledAt = dc;
  const custWhere: any = {};
  if (brandId) custWhere.brandId = brandId;
  if (session?.role === "agent") custWhere.assignedAgentId = session.sub;
  if (Object.keys(custWhere).length) where.customer = custWhere;
  if (outcome) where.outcome = outcome;

  const [brands, total, answered, sms, calls] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.call.count({ where }),
    prisma.call.count({ where: { ...where, outcome: "answered" } }),
    prisma.call.count({ where: { ...where, smsSent: true } }),
    prisma.call.findMany({
      where,
      include: { customer: { include: { brand: true } }, agent: true },
      orderBy: { calledAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // ยอดฝากของแต่ละเบอร์ "ในวันที่โทร" (map ตาม customerId+วันที่)
  const custIds = [...new Set(calls.map((c) => c.customerId))];
  const deps = custIds.length
    ? await prisma.deposit.findMany({ where: { customerId: { in: custIds } }, select: { customerId: true, depositDate: true, amount: true } })
    : [];
  const depMap = new Map<string, number>();
  for (const d of deps) {
    const k = `${d.customerId}|${d.depositDate.toISOString().slice(0, 10)}`;
    depMap.set(k, (depMap.get(k) || 0) + d.amount);
  }
  const depOf = (customerId: number, date: Date) => depMap.get(`${customerId}|${date.toISOString().slice(0, 10)}`) || 0;

  const pages = Math.ceil(total / PAGE_SIZE);
  const qs = (extra: Record<string, any>) => {
    const p = new URLSearchParams();
    if (range.from) p.set("from", range.from);
    if (range.to) p.set("to", range.to);
    if (brandId) p.set("brand", String(brandId));
    if (outcome) p.set("outcome", outcome);
    Object.entries(extra).forEach(([k, v]) => v != null && p.set(k, String(v)));
    return `/calls?${p.toString()}`;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">บันทึกการโทร</h1>
        <span className="badge badge-indigo">📅 {range.label}</span>
        <Link href={`/calls/new${sp.brand ? `?brand=${sp.brand}` : ""}`} className="btn" style={{ marginLeft: "auto", padding: "7px 14px" }}>📝 ลงข้อมูลการโทร</Link>
        <a href={`/api/export/calls?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as any).toString()}`}
          className="btn btn-ghost" style={{ padding: "7px 14px" }}>⬇️ ส่งออก Excel</a>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>ดูการโทรทั้งหมดแยกตามวัน — เลือกวันที่ด้านล่าง</p>

      <DateRangeFilter basePath="/calls" range={range} extra={{ brand: sp.brand, outcome: sp.outcome }} />

      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="card" style={{ padding: "12px 18px", minWidth: 150, borderLeft: "4px solid #2563eb", background: "linear-gradient(120deg, #2563eb14, #ffffff 72%)" }}>
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><span>📞</span>โทรทั้งหมด</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a", marginTop: 2 }}>{total.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: "12px 18px", minWidth: 150, borderLeft: "4px solid #059669", background: "linear-gradient(120deg, #05966914, #ffffff 72%)" }}>
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><span>✅</span>รับสาย</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#047857", marginTop: 2 }}>
            {answered.toLocaleString()} <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>({total ? ((answered / total) * 100).toFixed(0) : 0}%)</span>
          </div>
        </div>
        <div className="card" style={{ padding: "12px 18px", minWidth: 150, borderLeft: "4px solid #7c3aed", background: "linear-gradient(120deg, #7c3aed14, #ffffff 72%)" }}>
          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><span>💬</span>ส่ง SMS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6d28d9", marginTop: 2 }}>{sms.toLocaleString()}</div>
        </div>
      </div>

      <form method="get" action="/calls" className="card" style={{ padding: 14, display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        {range.from && <input type="hidden" name="from" value={range.from} />}
        {range.to && <input type="hidden" name="to" value={range.to} />}
        <select name="brand" defaultValue={brandId || ""}>
          <option value="">ทุกเว็บ</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="outcome" defaultValue={outcome}>
          <option value="">ทุกผลการโทร</option>
          <option value="answered">รับสาย</option>
          <option value="no_answer">ไม่รับสาย</option>
          <option value="unreachable">ติดต่อไม่ได้</option>
          <option value="refused">ปฏิเสธ</option>
        </select>
        <button type="submit" className="btn">กรอง</button>
      </form>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr><th>วันที่</th><th>เวลา</th><th>เบอร์</th><th>เว็บ</th><th>ผล</th><th>SMS</th><th style={{ textAlign: "right" }}>ฝากวันนั้น</th><th>พนักงาน</th><th>โน้ต</th></tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td>{fmtDate(c.calledAt)}</td>
                <td>{c.callTime || "-"}</td>
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/customers/${c.customerId}`} style={{ color: "#4338ca" }}>{c.customer.phone}</Link>
                </td>
                <td>{c.customer.brand.name}</td>
                <td><span className={`badge ${outcomeBadge(c.outcome)}`}>{outcomeLabel[c.outcome]}</span></td>
                <td>{c.smsSent ? "✓" : "—"}</td>
                <td style={{ textAlign: "right", fontWeight: 600, color: depOf(c.customerId, c.calledAt) ? "#166534" : "#cbd5e1" }}>
                  {depOf(c.customerId, c.calledAt) ? `฿${baht(depOf(c.customerId, c.calledAt))}` : "—"}
                </td>
                <td>{c.agent?.name || "-"}</td>
                <td style={{ color: "#64748b" }}>{c.note || "-"}</td>
              </tr>
            ))}
            {calls.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีการโทรในช่วงนี้</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} makeHref={(p) => qs({ page: p })} />
    </div>
  );
}
