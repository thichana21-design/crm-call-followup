import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgentReport } from "@/lib/report";
import { reportPresets, thaiToday } from "@/lib/dates";
import { baht, pct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmtThai = (s: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${s}T00:00:00`));

type SortKey = "agentName" | "calls" | "answered" | "answerRate" | "sms" | "returnedPeople" | "depositTotal";

export default async function AgentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string; dir?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const presets = reportPresets();
  const sp = await searchParams;
  const from = sp.from || presets.thisMonth.from;
  const to = sp.to || presets.thisMonth.to;
  const invalid = from > to;

  const report = invalid ? null : await getAgentReport(from, to);

  const sortKey = (sp.sort || "") as SortKey | "";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  if (report && sortKey) {
    report.rows.sort((a, b) => {
      const va = a[sortKey] as number | string, vb = b[sortKey] as number | string;
      const cmp = typeof va === "string" ? String(va).localeCompare(String(vb), "th") : (va as number) - (vb as number);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  const presetList = [presets.thisWeek, presets.lastWeek, presets.thisMonth, presets.lastMonth];
  const SortTh = ({ k, label }: { k: SortKey; label: string }) => {
    const active = sortKey === k;
    const nextDir = active && dir === "desc" ? "asc" : "desc";
    const arrow = active ? (dir === "desc" ? " ↓" : " ↑") : "";
    return (
      <th style={{ textAlign: k === "agentName" ? "left" : "right" }}>
        <Link href={`/reports/agents?from=${from}&to=${to}&sort=${k}&dir=${nextDir}`}
          style={{ color: active ? "#4338ca" : "inherit", fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>{label}{arrow}</Link>
      </th>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">ผลงานรายพนักงาน</h1>
        {!invalid && <span className="badge badge-indigo">📅 {fmtThai(from)} – {fmtThai(to)}</span>}
        <Link href={`/reports?from=${from}&to=${to}`} className="btn btn-ghost" style={{ marginLeft: "auto", padding: "7px 14px" }}>← รายงานรายเว็บ</Link>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>ตัวชี้วัดรายคน — ยอดฝากนับให้คนที่โทรครั้งล่าสุดก่อน/ในวันที่ลูกค้าฝาก</p>

      <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presetList.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link key={p.label} href={`/reports/agents?from=${p.from}&to=${p.to}`}
                className={`btn ${active ? "" : "btn-ghost"}`} style={{ padding: "6px 13px", fontSize: 13 }}>{p.label}</Link>
            );
          })}
        </div>
        <form method="get" action="/reports/agents" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>ช่วง</span>
          <input type="date" name="from" defaultValue={from} max={thaiToday()} />
          <span style={{ color: "#94a3b8" }}>→</span>
          <input type="date" name="to" defaultValue={to} max={thaiToday()} />
          <button type="submit" className="btn" style={{ padding: "7px 14px" }}>ดูรายงาน</button>
        </form>
      </div>

      {invalid ? (
        <div className="card" style={{ padding: 18 }}>
          <span className="badge badge-red" style={{ padding: 8 }}>วันที่เริ่มต้องไม่อยู่หลังวันที่จบ</span>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="section-title">👥 ผลงานรายคน ({fmtThai(from)} – {fmtThai(to)})</div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <SortTh k="agentName" label="พนักงาน" />
                  <SortTh k="calls" label="โทร" />
                  <SortTh k="answered" label="รับสาย" />
                  <SortTh k="answerRate" label="รับสาย %" />
                  <SortTh k="sms" label="ส่ง SMS" />
                  <SortTh k="returnedPeople" label="กลับมาฝาก/คน" />
                  <SortTh k="depositTotal" label="ยอดฝากที่ตามกลับ" />
                </tr>
              </thead>
              <tbody>
                {report!.rows.map((r) => (
                  <tr key={r.agentId ?? "null"}>
                    <td style={{ fontWeight: 600 }}>
                      {r.agentId == null ? r.agentName : <Link href={`/reports/agents/${r.agentId}?from=${from}&to=${to}`} style={{ color: "#2563eb" }}>{r.agentName}</Link>}
                    </td>
                    <td style={{ textAlign: "right" }}>{baht(r.calls)}</td>
                    <td style={{ textAlign: "right" }}>{baht(r.answered)}</td>
                    <td style={{ textAlign: "right" }}>{r.calls ? pct(r.answerRate) : "-"}</td>
                    <td style={{ textAlign: "right" }}>{baht(r.sms)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: r.returnedPeople ? "#166534" : undefined }}>{r.returnedPeople || "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{r.depositTotal ? `฿${baht(r.depositTotal)}` : "-"}</td>
                  </tr>
                ))}
                {report!.rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีผลงานในช่วงนี้</td></tr>}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: "#f8fafc" }}>
                  <td>รวมทั้งหมด</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.calls)}</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.answered)}</td>
                  <td style={{ textAlign: "right" }}>{report!.total.calls ? pct(report!.total.answerRate) : "-"}</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.sms)}</td>
                  <td style={{ textAlign: "right", color: "#166534" }}>{baht(report!.total.returnedPeople)}</td>
                  <td style={{ textAlign: "right" }}>฿{baht(report!.total.depositTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
