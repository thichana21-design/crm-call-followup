import { prisma } from "@/lib/prisma";
import { baht, pct } from "@/lib/format";
import { parseRange, dateWhere } from "@/lib/date";
import DateRangeFilter from "@/components/DateRangeFilter";
import Kpi from "@/components/Kpi";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats(range: ReturnType<typeof parseRange>) {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const dCall = dateWhere(range);
  const dDep = dateWhere(range);

  const rows = await Promise.all(
    brands.map(async (b) => {
      const where: any = { customer: { brandId: b.id } };
      if (dCall) where.calledAt = dCall;
      const depWhere: any = { customer: { brandId: b.id } };
      if (dDep) depWhere.depositDate = dDep;
      const [customers, calls, answered, sms, returned, dep] = await Promise.all([
        prisma.customer.count({ where: { brandId: b.id } }),
        prisma.call.count({ where }),
        prisma.call.count({ where: { ...where, outcome: "answered" } }),
        prisma.call.count({ where: { ...where, smsSent: true } }),
        prisma.customer.count({ where: { brandId: b.id, status: "returned" } }),
        prisma.deposit.aggregate({
          where: depWhere, _sum: { amount: true },
        }),
      ]);
      const depositTotal = dep._sum.amount || 0;
      return {
        id: b.id, name: b.name, customers, calls, answered,
        noAnswer: calls - answered, sms, returned, depositTotal,
        answerRate: calls ? answered / calls : 0,
      };
    })
  );

  const totals = rows.reduce(
    (a, r) => ({
      customers: a.customers + r.customers,
      calls: a.calls + r.calls,
      answered: a.answered + r.answered,
      noAnswer: a.noAnswer + r.noAnswer,
      sms: a.sms + r.sms,
      returned: a.returned + r.returned,
      depositTotal: a.depositTotal + r.depositTotal,
    }),
    { customers: 0, calls: 0, answered: 0, noAnswer: 0, sms: 0, returned: 0, depositTotal: 0 }
  );

  return { rows, totals };
}

type DashSortKey = "name" | "customers" | "calls" | "answered" | "answerRate" | "noAnswer" | "sms" | "returned" | "depositTotal";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { rows, totals } = await getStats(range);
  const answerRate = totals.calls ? totals.answered / totals.calls : 0;

  // เรียงตามคอลัมน์ที่คลิก
  const sortKey = (sp.sort || "") as DashSortKey | "";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  if (sortKey) {
    rows.sort((a: any, b: any) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === "string" ? String(va).localeCompare(String(vb), "th") : (va as number) - (vb as number);
      return dir === "asc" ? cmp : -cmp;
    });
  }
  const rangeQs = [range.from ? `from=${range.from}` : "", range.to ? `to=${range.to}` : ""].filter(Boolean).join("&");
  const SortTh = ({ k, label }: { k: DashSortKey; label: string }) => {
    const active = sortKey === k;
    const nextDir = active && dir === "desc" ? "asc" : "desc";
    const arrow = active ? (dir === "desc" ? " ↓" : " ↑") : "";
    const href = `/?${[rangeQs, `sort=${k}`, `dir=${nextDir}`].filter(Boolean).join("&")}`;
    return (
      <th style={{ textAlign: k === "name" ? "left" : "right" }}>
        <Link href={href} style={{ color: active ? "#4338ca" : "inherit", fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>{label}{arrow}</Link>
      </th>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">ภาพรวมการติดตามลูกค้า</h1>
        <span className="badge badge-indigo">📅 {range.label}</span>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>สรุปผลทุกเว็บแบบเรียลไทม์ — เลือกช่วงวันที่เพื่อดูข้อมูลแต่ละวันได้</p>

      <DateRangeFilter basePath="/" range={range} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
        <Kpi label="ลูกค้าทั้งหมด" value={baht(totals.customers)} sub={`${rows.length} เว็บ`} icon="👥" accent="#6366f1" />
        <Kpi label="โทรติดตาม" value={baht(totals.calls)} sub={`รับสาย ${pct(answerRate)}`} icon="📞" accent="#0ea5e9" />
        <Kpi label="ส่ง SMS" value={baht(totals.sms)} icon="💬" accent="#8b5cf6" />
        <Kpi label="กลับมาฝาก" value={baht(totals.returned)} sub={`${pct(totals.customers ? totals.returned / totals.customers : 0)} ของลูกค้า`} icon="✅" accent="#10b981" />
        <Kpi label="ยอดกลับมาฝากรวม" value={`฿${baht(totals.depositTotal)}`} icon="💰" accent="#f59e0b" />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="section-title">📈 สรุปรายเว็บ</div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <SortTh k="name" label="เว็บ" />
                <SortTh k="customers" label="ลูกค้า" />
                <SortTh k="calls" label="โทร" />
                <SortTh k="answered" label="รับสาย" />
                <SortTh k="answerRate" label="รับสาย %" />
                <SortTh k="noAnswer" label="ไม่รับสาย" />
                <SortTh k="sms" label="ส่ง SMS" />
                <SortTh k="returned" label="กลับมาฝาก" />
                <SortTh k="depositTotal" label="ยอดฝากรวม" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/brands/${r.id}`} style={{ color: "#2563eb" }}>{r.name}</Link>
                  </td>
                  <td style={{ textAlign: "right" }}>{baht(r.customers)}</td>
                  <td style={{ textAlign: "right" }}>{baht(r.calls)}</td>
                  <td style={{ textAlign: "right" }}>{baht(r.answered)}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`badge ${r.answerRate >= 0.35 ? "badge-green" : r.answerRate >= 0.25 ? "badge-amber" : "badge-red"}`}>
                      {pct(r.answerRate)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{baht(r.noAnswer)}</td>
                  <td style={{ textAlign: "right" }}>{baht(r.sms)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "#166534" }}>{baht(r.returned)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>฿{baht(r.depositTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: "#f8fafc" }}>
                <td>รวมทั้งหมด</td>
                <td style={{ textAlign: "right" }}>{baht(totals.customers)}</td>
                <td style={{ textAlign: "right" }}>{baht(totals.calls)}</td>
                <td style={{ textAlign: "right" }}>{baht(totals.answered)}</td>
                <td style={{ textAlign: "right" }}>{pct(answerRate)}</td>
                <td style={{ textAlign: "right" }}>{baht(totals.noAnswer)}</td>
                <td style={{ textAlign: "right" }}>{baht(totals.sms)}</td>
                <td style={{ textAlign: "right", color: "#166534" }}>{baht(totals.returned)}</td>
                <td style={{ textAlign: "right" }}>฿{baht(totals.depositTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
