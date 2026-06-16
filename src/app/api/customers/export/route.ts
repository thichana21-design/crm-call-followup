import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

// escape ค่าตามมาตรฐาน CSV (ครอบ " ถ้ามี comma/quote/ขึ้นบรรทัด)
function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// เบอร์โทรในรูปสูตร Excel ="0891234567" กันเลข 0 หน้าหาย
function phoneCell(phone: string): string {
  return `"=""${phone.replace(/"/g, '""')}"""`;
}

export async function GET(req: Request) {
  // จำกัดสิทธิ์: เฉพาะหัวหน้าทีม (lead) ขึ้นไป
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) {
    return new Response("ไม่มีสิทธิ์เข้าถึง", { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const brandId = url.searchParams.get("brand") ? Number(url.searchParams.get("brand")) : undefined;

  const where: any = {};
  if (brandId) where.brandId = brandId;
  if (q) where.phone = { contains: q };

  const customers = await prisma.customer.findMany({
    where,
    select: {
      phone: true,
      status: true,
      brand: { select: { name: true } },
      _count: { select: { calls: true } },
      deposits: { select: { amount: true } },
      bonuses: { select: { amount: true } },
    },
    orderBy: { id: "asc" },
  });

  const header = ["เบอร์โทร", "เว็บ", "สถานะ", "จำนวนครั้งที่โทร", "ยอดฝากหลังติดตามรวม", "โบนัสรวม"];
  const lines = [header.map(csvCell).join(",")];

  for (const c of customers) {
    const depositTotal = c.deposits.reduce((a, d) => a + d.amount, 0);
    const bonusTotal = c.bonuses.reduce((a, b) => a + b.amount, 0);
    lines.push([
      phoneCell(c.phone),
      csvCell(c.brand.name),
      csvCell(statusLabel[c.status] || c.status),
      csvCell(c._count.calls),
      csvCell(depositTotal),
      csvCell(bonusTotal),
    ].join(","));
  }

  // UTF-8 BOM กันภาษาไทยเพี้ยนใน Excel
  const body = "﻿" + lines.join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers.csv"',
    },
  });
}
