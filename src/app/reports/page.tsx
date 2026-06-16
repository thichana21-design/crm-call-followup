import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBrandSummary } from "@/lib/report";
import { reportPresets, thaiToday } from "@/lib/dates";
import { baht, pct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmtThai = (s: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${s}T00:00:00`));

type SortKey =
  | "brandName" | "calls" | "answered" | "answerRate" | "noAnswer"
  | "noAnswerRate" | "returnedPeople" | "depositTotal" | "bonusTotal" | "bonusPerDepositPct";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string; dir?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const presets = reportPresets();
  const sp = await searchParams;
  // ค่าเริ่มต้น = เดือนนี้
  const from = sp.from || presets.thisMonth.from;
  const to = sp.to || presets.thisMonth.to;
  const invalid = from > to;

  const report = invalid ? null : await getBrandSummary(from, to);

  // เรียงลำดับตามคอลัมน์ที่เลือก (คลิกหัวตาราง)
  const sortKey = (sp.sort || "") as SortKey | "";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  if (report && sortKey) {
    report.rows.sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      const cmp = typeof va === "string" ? String(va).localeCompare(String(vb), "th") : (va as number) - (vb as number);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  const presetList = [presets.thisWeek, presets.lastWeek, presets.thisMonth, presets.lastMonth];
  const expHref = `/api/reports/export?from=${from}&to=${to}`;

  // หัวคอลัมน์ที่คลิกเรียงได้
  const SortTh = ({ k, label }: { k: SortKey; label: string }) => {
    const isActive = sortKey === k;
    const nextDir = isActive && dir === "desc" ? "asc" : "desc";
    const arrow = isActive ? (dir === "desc" ? " ↓" : " ↑") : "";
    return (
      <th style={{ textAlign: k === "brandName" ? "left" : "right" }}>
        <Link href={`/reports?from=${from}&to=${to}&sort=${k}&dir=${nextDir}`}
          style={{ color: isActive ? "#4338ca" : "inherit", fontWeight: isActive ? 700 : 600, whiteSpace: "nowrap" }}>
          {label}{arrow}
        </Link>
      </th>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title">รายงานสรุปผล</h1>
        {!invalid && <span className="badge badge-indigo">📅 {fmtThai(from)} – {fmtThai(to)}</span>}
        <Link href={`/reports/agents?from=${from}&to=${to}`} className="btn" style={{ marginLeft: "auto", padding: "7px 14px" }}>👥 ผลงานรายพนักงาน</Link>
        <Link href={`/reports/cohort?from=${from}&to=${to}`} className="btn" style={{ padding: "7px 14px", background: "linear-gradient(180deg,#10b981,#059669)" }}>📈 วิเคราะห์การฝาก</Link>
        <a href={expHref} className="btn btn-ghost" style={{ padding: "7px 14px" }}>⬇️ ส่งออก Excel</a>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>สรุปผลติดตามลูกค้ารายเว็บ — เลือกช่วงวันที่ (แทนการทำชีทมือ)</p>

      {/* ปุ่มลัด + ฟอร์มช่วงวันที่ */}
      <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presetList.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link key={p.label} href={`/reports?from=${p.from}&to=${p.to}`}
                className={`btn ${active ? "" : "btn-ghost"}`} style={{ padding: "6px 13px", fontSize: 13 }}>
                {p.label}
              </Link>
            );
          })}
        </div>
        <form method="get" action="/reports" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>ช่วง</span>
          <input type="date" name="from" defaultValue={from} max={thaiToday()} />
          <span style={{ color: "#94a3b8" }}>→</span>
          <input type="date" name="to" defaultValue={to} max={thaiToday()} />
          <button type="submit" className="btn" style={{ padding: "7px 14px" }}>ดูรายงาน</button>
        </form>
      </div>

      {invalid ? (
        <div className="card" style={{ padding: 18 }}>
          <span className="badge badge-red" style={{ padding: 8 }}>วันที่เริ่มต้องไม่อยู่หลังวันที่จบ — กรุณาเลือกช่วงใหม่</span>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="section-title">📊 สรุปรายเว็บ ({fmtThai(from)} – {fmtThai(to)})</div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <SortTh k="brandName" label="เว็บ" />
                  <SortTh k="calls" label="โทรติดตาม" />
                  <SortTh k="answered" label="รับสาย" />
                  <SortTh k="answerRate" label="รับสาย %" />
                  <SortTh k="noAnswer" label="ไม่รับสาย" />
                  <SortTh k="noAnswerRate" label="ไม่รับสาย %" />
                  <SortTh k="returnedPeople" label="กลับมาฝาก/คน" />
                  <SortTh k="depositTotal" label="ยอดกลับมาฝาก" />
                  <SortTh k="bonusTotal" label="โบนัสที่เติม" />
                  <SortTh k="bonusPerDepositPct" label="โบนัส/ยอดฝาก %" />
                </tr>
              </thead>
              <tbody>
                {report!.rows.map((r) => (
                  <tr key={r.brandId}>
                    <td style={{ fontWeight: 600 }}>{r.brandName}</td>
                    <td style={{ textAlign: "right" }}>{r.calls ? baht(r.calls) : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.answered ? baht(r.answered) : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.calls ? pct(r.answerRate) : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.noAnswer ? baht(r.noAnswer) : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.calls ? pct(r.noAnswerRate) : "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: r.returnedPeople ? "#166534" : undefined }}>{r.returnedPeople || "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.depositTotal ? `฿${baht(r.depositTotal)}` : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.bonusTotal ? `฿${baht(r.bonusTotal)}` : "-"}</td>
                    <td style={{ textAlign: "right" }}>{r.depositTotal ? pct(r.bonusPerDepositPct) : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: "#f8fafc" }}>
                  <td>รวมทั้งหมด</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.calls)}</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.answered)}</td>
                  <td style={{ textAlign: "right" }}>{report!.total.calls ? pct(report!.total.answerRate) : "-"}</td>
                  <td style={{ textAlign: "right" }}>{baht(report!.total.noAnswer)}</td>
                  <td style={{ textAlign: "right" }}>{report!.total.calls ? pct(report!.total.noAnswerRate) : "-"}</td>
                  <td style={{ textAlign: "right", color: "#166534" }}>{baht(report!.total.returnedPeople)}</td>
                  <td style={{ textAlign: "right" }}>฿{baht(report!.total.depositTotal)}</td>
                  <td style={{ textAlign: "right" }}>฿{baht(report!.total.bonusTotal)}</td>
                  <td style={{ textAlign: "right" }}>{report!.total.depositTotal ? pct(report!.total.bonusPerDepositPct) : "-"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
