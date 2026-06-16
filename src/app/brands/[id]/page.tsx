import { prisma } from "@/lib/prisma";
import { baht, pct, fmtDate, outcomeLabel } from "@/lib/format";
import { parseRange, dateWhere } from "@/lib/date";
import DateRangeFilter from "@/components/DateRangeFilter";
import Kpi from "@/components/Kpi";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BrandDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const brandId = Number(id);
  const sp = await searchParams;
  const range = parseRange(sp);

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) notFound();

  const dc = dateWhere(range);
  const callWhere: any = { customer: { brandId } };
  if (dc) callWhere.calledAt = dc;
  const depWhere: any = { customer: { brandId } };
  if (dc) depWhere.depositDate = dc;

  const [customers, returned, calls, answered, noAnswer, unreachable, refused, sms, dep, callRows, depRows] =
    await Promise.all([
      prisma.customer.count({ where: { brandId } }),
      prisma.customer.count({ where: { brandId, status: "returned" } }),
      prisma.call.count({ where: callWhere }),
      prisma.call.count({ where: { ...callWhere, outcome: "answered" } }),
      prisma.call.count({ where: { ...callWhere, outcome: "no_answer" } }),
      prisma.call.count({ where: { ...callWhere, outcome: "unreachable" } }),
      prisma.call.count({ where: { ...callWhere, outcome: "refused" } }),
      prisma.call.count({ where: { ...callWhere, smsSent: true } }),
      prisma.deposit.aggregate({ where: depWhere, _sum: { amount: true }, _count: true }),
      prisma.call.findMany({ where: callWhere, select: { calledAt: true, outcome: true, smsSent: true } }),
      prisma.deposit.findMany({ where: depWhere, select: { depositDate: true, amount: true, customerId: true } }),
    ]);

  const depositTotal = dep._sum.amount || 0;
  const depositCount = dep._count || 0;
  const answerRate = calls ? answered / calls : 0;

  // รวมรายวัน
  type Day = { calls: number; answered: number; sms: number; depCount: number; depSum: number };
  const byDay = new Map<string, Day>();
  const keyOf = (d: Date) => d.toISOString().slice(0, 10);
  const ensure = (k: string) => {
    if (!byDay.has(k)) byDay.set(k, { calls: 0, answered: 0, sms: 0, depCount: 0, depSum: 0 });
    return byDay.get(k)!;
  };
  for (const c of callRows) {
    const d = ensure(keyOf(c.calledAt));
    d.calls++;
    if (c.outcome === "answered") d.answered++;
    if (c.smsSent) d.sms++;
  }
  for (const r of depRows) {
    const d = ensure(keyOf(r.depositDate));
    d.depCount++;
    d.depSum += r.amount;
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div>
      <Link href="/brands" style={{ color: "#64748b", fontSize: 14 }}>← กลับรายการเว็บ</Link>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <h1 className="page-title">🏷️ {brand.name}</h1>
        <span className="badge badge-indigo">📅 {range.label}</span>
        <a href={`/api/export/calls?brand=${brandId}${range.from ? `&from=${range.from}` : ""}${range.to ? `&to=${range.to}` : ""}`}
          className="btn btn-ghost" style={{ marginLeft: "auto", padding: "7px 14px" }}>⬇️ ส่งออก Excel</a>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>สรุปเชิงลึกของเว็บนี้ — เลือกช่วงวันที่เพื่อดูแต่ละวันได้</p>

      <DateRangeFilter basePath={`/brands/${brandId}`} range={range} />

      {/* KPI ชุดเดียวกับภาพรวม */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Kpi label="ลูกค้าทั้งหมด" value={baht(customers)} sub={`กลับมาฝาก ${baht(returned)}`} icon="👥" accent="#6366f1" />
        <Kpi label="โทรติดตาม" value={baht(calls)} sub={`รับสาย ${pct(answerRate)}`} icon="📞" accent="#0ea5e9" />
        <Kpi label="ส่ง SMS" value={baht(sms)} icon="💬" accent="#8b5cf6" />
        <Kpi label="กลับมาฝาก" value={baht(depositCount)} sub={`${pct(customers ? returned / customers : 0)} ของลูกค้า`} icon="✅" accent="#10b981" />
        <Kpi label="ยอดกลับมาฝากรวม" value={`฿${baht(depositTotal)}`} sub={depositCount ? `เฉลี่ย ฿${baht(depositTotal / depositCount)}/ครั้ง` : undefined} icon="💰" accent="#f59e0b" />
      </div>

      {/* ผลการโทรแยกประเภท */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div className="section-title">📋 ผลการโทรแยกประเภท</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          {[
            { label: "รับสาย", value: answered, color: "#047857", rate: calls ? answered / calls : 0 },
            { label: "ไม่รับสาย", value: noAnswer, color: "#b45309", rate: calls ? noAnswer / calls : 0 },
            { label: "ติดต่อไม่ได้", value: unreachable, color: "#475569", rate: calls ? unreachable / calls : 0 },
            { label: "ปฏิเสธ", value: refused, color: "#b91c1c", rate: calls ? refused / calls : 0 },
          ].map((o, i) => (
            <div key={o.label} style={{ padding: "16px 20px", borderLeft: i ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>{o.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: o.color }}>{baht(o.value)}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{pct(o.rate)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ตารางแยกรายวัน */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="section-title">🗓️ สรุปแยกรายวัน</div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th style={{ textAlign: "right" }}>โทร</th>
                <th style={{ textAlign: "right" }}>รับสาย</th>
                <th style={{ textAlign: "right" }}>รับสาย %</th>
                <th style={{ textAlign: "right" }}>ส่ง SMS</th>
                <th style={{ textAlign: "right" }}>กลับมาฝาก (ครั้ง)</th>
                <th style={{ textAlign: "right" }}>ยอดฝาก</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([k, d]) => (
                <tr key={k}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/calls?brand=${brandId}&from=${k}&to=${k}`} style={{ color: "#4338ca" }}>{fmtDate(k)} →</Link>
                  </td>
                  <td style={{ textAlign: "right" }}>{baht(d.calls)}</td>
                  <td style={{ textAlign: "right" }}>{baht(d.answered)}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`badge ${d.calls && d.answered / d.calls >= 0.35 ? "badge-green" : d.calls && d.answered / d.calls >= 0.25 ? "badge-amber" : "badge-red"}`}>
                      {pct(d.calls ? d.answered / d.calls : 0)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{baht(d.sms)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: d.depCount ? "#166534" : "#cbd5e1" }}>{baht(d.depCount)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{d.depSum ? `฿${baht(d.depSum)}` : "—"}</td>
                </tr>
              ))}
              {days.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีข้อมูลในช่วงนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
