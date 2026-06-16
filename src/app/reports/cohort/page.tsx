import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCohortReport } from "@/lib/report";
import { reportPresets, thaiToday } from "@/lib/dates";
import { baht, pct } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmtThai = (s: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${s}T00:00:00`));

// แถบสี heat: % สูง = เขียวเข้ม
function heat(rate: number) {
  const a = Math.min(0.85, rate * 6);
  return { background: `rgba(16,185,129,${a})`, fontWeight: rate > 0 ? 600 : 400 };
}

function ConvCell({ count, called }: { count: number; called: number }) {
  const rate = called ? count / called : 0;
  return (
    <td style={{ textAlign: "right", ...heat(rate) }}>
      {count ? <>{baht(count)} <span style={{ color: "#475569", fontSize: 12 }}>({pct(rate)})</span></> : "-"}
    </td>
  );
}

export default async function CohortPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const presets = reportPresets();
  const sp = await searchParams;
  const from = sp.from || presets.thisMonth.from;
  const to = sp.to || presets.thisMonth.to;
  const invalid = from > to;

  const report = invalid ? null : await getCohortReport(from, to);
  const presetList = [presets.thisWeek, presets.lastWeek, presets.thisMonth, presets.lastMonth];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title">วิเคราะห์การกลับมาฝากหลังติดตาม</h1>
        <span className="badge badge-slate">Cohort Analysis</span>
        {!invalid && <span className="badge badge-indigo">📅 ช่วงโทร {fmtThai(from)} – {fmtThai(to)}</span>}
        <Link href={`/reports?from=${from}&to=${to}`} className="btn btn-ghost" style={{ marginLeft: "auto", padding: "7px 14px" }}>← รายงานรายเว็บ</Link>
      </div>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        วัดผลว่าหลัง “โทรครั้งแรก” ลูกค้ากลับมาฝากภายใน 3 / 7 / 14 / 31 วันมากแค่ไหน — นับลูกค้า 1 คนเพียงครั้งเดียว และไม่นับการฝากที่เกิดก่อนวันโทร
      </p>

      <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {presetList.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link key={p.label} href={`/reports/cohort?from=${p.from}&to=${p.to}`}
                className={`btn ${active ? "" : "btn-ghost"}`} style={{ padding: "6px 13px", fontSize: 13 }}>{p.label}</Link>
            );
          })}
        </div>
        <form method="get" action="/reports/cohort" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>ช่วงการโทร</span>
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
        <>
          {report!.incomplete && (
            <div className="card" style={{ padding: 14, marginBottom: 16, background: "#fffbeb", border: "1px solid #fde68a" }}>
              <span style={{ color: "#b45309", fontWeight: 600 }}>⚠️ ข้อมูลยังไม่ครบกำหนด</span>
              <span style={{ color: "#92400e", fontSize: 13 }}> — ช่วง 31 วันของบางคนสิ้นสุดวันที่ {fmtThai(report!.windowEnd)} ซึ่งเลยวันนี้ ({fmtThai(report!.today)}) ตัวเลข 14/31 วันอาจยังเพิ่มได้อีก</span>
            </div>
          )}

          <div className="card" style={{ overflow: "hidden", marginBottom: 22 }}>
            <div className="section-title">📈 อัตรากลับมาฝากตามช่วงเวลา</div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>เว็บ</th>
                    <th style={{ textAlign: "right" }}>ลูกค้าที่โทร</th>
                    <th style={{ textAlign: "right" }}>ใน 3 วัน</th>
                    <th style={{ textAlign: "right" }}>ใน 7 วัน</th>
                    <th style={{ textAlign: "right" }}>ใน 14 วัน</th>
                    <th style={{ textAlign: "right" }}>ใน 31 วัน</th>
                    <th style={{ textAlign: "right" }}>ยอดฝากใน 31 วัน</th>
                  </tr>
                </thead>
                <tbody>
                  {report!.rows.map((r) => (
                    <tr key={r.brandId}>
                      <td style={{ fontWeight: 600 }}>{r.brandName}</td>
                      <td style={{ textAlign: "right" }}>{baht(r.called)}</td>
                      <ConvCell count={r.d3} called={r.called} />
                      <ConvCell count={r.d7} called={r.called} />
                      <ConvCell count={r.d14} called={r.called} />
                      <ConvCell count={r.d31} called={r.called} />
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{r.depTotal ? `฿${baht(r.depTotal)}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, background: "#f8fafc" }}>
                    <td>รวมทั้งหมด</td>
                    <td style={{ textAlign: "right" }}>{baht(report!.total.called)}</td>
                    <ConvCell count={report!.total.d3} called={report!.total.called} />
                    <ConvCell count={report!.total.d7} called={report!.total.called} />
                    <ConvCell count={report!.total.d14} called={report!.total.called} />
                    <ConvCell count={report!.total.d31} called={report!.total.called} />
                    <td style={{ textAlign: "right" }}>฿{baht(report!.total.depTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Table 2 — เทียบกลุ่มโปร 20% (ต้องมีข้อมูลโปร) */}
          <div className="card" style={{ padding: 18, background: "#f8fafc" }}>
            <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 8 }}>🎁 เทียบกลุ่มที่ได้รับโปรโมชัน 20% (ต้องมีข้อมูลโปรโมชันก่อน)</div>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
              ตารางเทียบ “กลุ่มที่ได้รับโปรโมชัน 20% เทียบกับกลุ่มที่ไม่ได้รับ” ต้องใช้ข้อมูล <b>การเสนอโปรโมชัน 20%</b> และ <b>ยอดโบนัส</b> —
              ซึ่งตอนนำเข้าจาก Excel ยังไม่ได้ดึงคอลัมน์เหล่านี้เข้าระบบ (เหมือนช่อง “โบนัส” ในหน้ารายงานที่เป็น 0)
              ถ้าต้องการส่วนนี้ ต้องเพิ่มการบันทึก “เสนอโปรโมชัน” ตอนบันทึกการโทร + import ยอดโบนัสเข้ามาก่อน
            </p>
          </div>
        </>
      )}
    </div>
  );
}
