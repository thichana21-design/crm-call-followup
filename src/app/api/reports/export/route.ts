import { getSession } from "@/lib/auth";
import { getBrandSummary } from "@/lib/report";
import { reportPresets } from "@/lib/dates";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const ddmmyyyy = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export async function GET(req: Request) {
  // เฉพาะหัวหน้าทีมขึ้นไป
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) {
    return new Response("ไม่มีสิทธิ์เข้าถึง", { status: 403 });
  }

  const url = new URL(req.url);
  const presets = reportPresets();
  const from = url.searchParams.get("from") || presets.thisMonth.from;
  const to = url.searchParams.get("to") || presets.thisMonth.to;
  if (from > to) return new Response("ช่วงวันที่ไม่ถูกต้อง", { status: 400 });

  // ใช้ฟังก์ชันเดียวกับหน้าเว็บ -> ตัวเลขตรงกัน 100%
  const report = await getBrandSummary(from, to);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("สรุปผล");

  // แถวหัวเรื่อง: ช่วงวันที่
  ws.mergeCells("A1", "J1");
  ws.getCell("A1").value = `สรุปผลติดตามลูกค้า ${ddmmyyyy(from)} - ${ddmmyyyy(to)}`;
  ws.getCell("A1").font = { bold: true, size: 14 };

  const header = ["เว็บ", "โทรติดตาม", "รับสาย", "รับสาย %", "ไม่รับสาย", "ไม่รับสาย %", "กลับมาฝาก/คน", "ยอดกลับมาฝาก", "โบนัสที่เติม", "โบนัส/ยอดฝาก %"];
  const headerRow = ws.addRow(header);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

  const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`;
  for (const r of report.rows) {
    ws.addRow([
      r.brandName, r.calls, r.answered, pct1(r.answerRate), r.noAnswer, pct1(r.noAnswerRate),
      r.returnedPeople, r.depositTotal, r.bonusTotal, pct1(r.bonusPerDepositPct),
    ]);
  }
  const t = report.total;
  const totalRow = ws.addRow([
    "รวมทั้งหมด", t.calls, t.answered, pct1(t.answerRate), t.noAnswer, pct1(t.noAnswerRate),
    t.returnedPeople, t.depositTotal, t.bonusTotal, pct1(t.bonusPerDepositPct),
  ]);
  totalRow.font = { bold: true };

  ws.getColumn(8).numFmt = "#,##0.00"; // ยอดฝาก
  ws.getColumn(9).numFmt = "#,##0.00"; // โบนัส
  ws.columns.forEach((c) => { c.width = 15; });
  ws.getColumn(1).width = 16;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report_${from}_${to}.xlsx"`,
    },
  });
}
