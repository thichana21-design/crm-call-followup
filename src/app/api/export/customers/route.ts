import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/format";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams);
  const brandId = sp.brand ? Number(sp.brand) : undefined;
  const status = sp.status || "";
  const q = (sp.q || "").trim();

  const where: any = {};
  if (brandId) where.brandId = brandId;
  if (status) where.status = status;
  if (q) where.phone = { contains: q };

  const customers = await prisma.customer.findMany({
    where,
    include: {
      brand: true,
      _count: { select: { calls: true } },
      deposits: true,
    },
    orderBy: { id: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ลูกค้า");
  ws.columns = [
    { header: "เบอร์โทร", key: "phone", width: 16 },
    { header: "เว็บ", key: "brand", width: 16 },
    { header: "สถานะ", key: "status", width: 14 },
    { header: "จำนวนโทร", key: "calls", width: 12 },
    { header: "ยอดกลับมาฝากรวม", key: "deposit", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };

  for (const c of customers) {
    const dep = c.deposits.reduce((a, d) => a + d.amount, 0);
    ws.addRow({
      phone: c.phone,
      brand: c.brand.name,
      status: statusLabel[c.status] || c.status,
      calls: c._count.calls,
      deposit: dep,
    });
  }
  ws.getColumn("deposit").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers.xlsx"`,
    },
  });
}
