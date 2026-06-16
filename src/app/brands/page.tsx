import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const rows = await Promise.all(
    brands.map(async (b) => {
      const [customers, returned, dep] = await Promise.all([
        prisma.customer.count({ where: { brandId: b.id } }),
        prisma.customer.count({ where: { brandId: b.id, status: "returned" } }),
        prisma.deposit.aggregate({ where: { customer: { brandId: b.id } }, _sum: { amount: true } }),
      ]);
      return { ...b, customers, returned, deposit: dep._sum.amount || 0 };
    })
  );

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 18 }}>เว็บ / แบรนด์</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {rows.map((b, i) => {
          const accents = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#84cc16"];
          const accent = accents[i % accents.length];
          return (
          <Link key={b.id} href={`/brands/${b.id}`} className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: `${accent}1a`, fontSize: 15 }}>🏷️</span>
              {b.name}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>ลูกค้า</span><b>{baht(b.customers)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>กลับมาฝาก</span><b style={{ color: "#166534" }}>{baht(b.returned)}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 12 }}>
              <span style={{ color: "#64748b" }}>ยอดฝากรวม</span><b>฿{baht(b.deposit)}</b>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>ดูรายละเอียด →</div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
