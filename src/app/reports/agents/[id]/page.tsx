import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { reportPresets } from "@/lib/dates";
import { baht, pct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmtThai = (s: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${s}T00:00:00`));
const thaiDay = (d: Date) => new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);

export default async function AgentDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const { id } = await params;
  const agentId = Number(id);
  const presets = reportPresets();
  const sp = await searchParams;
  const from = sp.from || presets.thisMonth.from;
  const to = sp.to || presets.thisMonth.to;

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { id: true, name: true } });
  if (!agent) notFound();

  const callFrom = new Date(`${from}T00:00:00+07:00`);
  const callToExcl = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000);

  const calls = await prisma.call.findMany({
    where: { agentId, calledAt: { gte: callFrom, lt: callToExcl } },
    select: { calledAt: true, outcome: true, smsSent: true },
  });

  // รวมรายวัน (เวลาไทย)
  const byDay = new Map<string, { calls: number; answered: number; sms: number }>();
  for (const c of calls) {
    const k = thaiDay(c.calledAt);
    if (!byDay.has(k)) byDay.set(k, { calls: 0, answered: 0, sms: 0 });
    const d = byDay.get(k)!;
    d.calls++;
    if (c.outcome === "answered") d.answered++;
    if (c.smsSent) d.sms++;
  }
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const totalCalls = calls.length;
  const totalAns = calls.filter((c) => c.outcome === "answered").length;

  return (
    <div>
      <Link href={`/reports/agents?from=${from}&to=${to}`} style={{ color: "#64748b", fontSize: 14 }}>← กลับผลงานรายพนักงาน</Link>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "10px 0 4px", flexWrap: "wrap" }}>
        <h1 className="page-title">{agent.name}</h1>
        <span className="badge badge-indigo">📅 {fmtThai(from)} – {fmtThai(to)}</span>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        ผลงานรายวัน — โทรรวม {baht(totalCalls)} สาย · รับสาย {baht(totalAns)} ({totalCalls ? pct(totalAns / totalCalls) : "-"})
      </p>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="section-title">🗓️ แยกรายวัน</div>
        <table>
          <thead>
            <tr><th>วันที่</th><th style={{ textAlign: "right" }}>โทร</th><th style={{ textAlign: "right" }}>รับสาย</th><th style={{ textAlign: "right" }}>รับสาย %</th><th style={{ textAlign: "right" }}>ส่ง SMS</th></tr>
          </thead>
          <tbody>
            {days.map(([k, d]) => (
              <tr key={k}>
                <td style={{ fontWeight: 600 }}>{fmtThai(k)}</td>
                <td style={{ textAlign: "right" }}>{baht(d.calls)}</td>
                <td style={{ textAlign: "right" }}>{baht(d.answered)}</td>
                <td style={{ textAlign: "right" }}>{d.calls ? pct(d.answered / d.calls) : "-"}</td>
                <td style={{ textAlign: "right" }}>{baht(d.sms)}</td>
              </tr>
            ))}
            {days.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีการโทรในช่วงนี้</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
