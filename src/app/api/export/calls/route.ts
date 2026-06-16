import { prisma } from "@/lib/prisma";
import { parseRange, dateWhere } from "@/lib/date";
import { outcomeLabel } from "@/lib/format";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const range = parseRange(sp);
  const brandId = sp.brand ? Number(sp.brand) : undefined;
  const outcome = sp.outcome || "";

  const where: any = {};
  const dc = dateWhere(range);
  if (dc) where.calledAt = dc;
  if (brandId) where.customer = { brandId };
  if (outcome) where.outcome = outcome;

  const calls = await prisma.call.findMany({
    where,
    include: { customer: { include: { brand: true } }, agent: true },
    orderBy: { calledAt: "desc" },
  });

  // ยอดฝากของแต่ละเบอร์ในวันที่โทร
  const custIds = [...new Set(calls.map((c) => c.customerId))];
  const deps = custIds.length
    ? await prisma.deposit.findMany({ where: { customerId: { in: custIds } }, select: { customerId: true, depositDate: true, amount: true } })
    : [];
  const depMap = new Map<string, number>();
  for (const d of deps) {
    const k = `${d.customerId}|${d.depositDate.toISOString().slice(0, 10)}`;
    depMap.set(k, (depMap.get(k) || 0) + d.amount);
  }
  const depOf = (cid: number, date: Date) => depMap.get(`${cid}|${date.toISOString().slice(0, 10)}`) || 0;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("บันทึกการโทร");
  ws.columns = [
    { header: "วันที่", key: "date", width: 14 },
    { header: "เวลา", key: "time", width: 10 },
    { header: "เบอร์โทร", key: "phone", width: 16 },
    { header: "เว็บ", key: "brand", width: 16 },
    { header: "ผลการโทร", key: "outcome", width: 14 },
    { header: "ส่ง SMS", key: "sms", width: 10 },
    { header: "ยอดฝากวันนั้น", key: "deposit", width: 16 },
    { header: "พนักงาน", key: "agent", width: 16 },
    { header: "โน้ต", key: "note", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

  for (const c of calls) {
    ws.addRow({
      date: c.calledAt.toISOString().slice(0, 10),
      time: c.callTime || "",
      phone: c.customer.phone,
      brand: c.customer.brand.name,
      outcome: outcomeLabel[c.outcome] || c.outcome,
      sms: c.smsSent ? "✓" : "",
      deposit: depOf(c.customerId, c.calledAt) || "",
      agent: c.agent?.name || "",
      note: c.note || "",
    });
  }
  ws.getColumn("deposit").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  const tag = range.active ? `${range.from || "all"}_${range.to || ""}` : "all";
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="calls_${tag}.xlsx"`,
    },
  });
}
