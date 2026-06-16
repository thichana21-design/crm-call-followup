import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/format";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

const badgeFor = (s: string) =>
  s === "returned" ? "badge-green" : s === "lost" ? "badge-red" : "badge-amber";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const brandId = sp.brand ? Number(sp.brand) : undefined;
  const status = sp.status || "";
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort || "";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const where: any = {};
  if (brandId) where.brandId = brandId;
  if (status) where.status = status;
  if (q) where.phone = { contains: q };
  if (session?.role === "agent") where.assignedAgentId = session.sub;

  // เรียงระดับ DB (รองรับ pagination)
  const orderBy: any =
    sort === "phone" ? { phone: dir }
    : sort === "brand" ? { brand: { name: dir } }
    : sort === "status" ? { status: dir }
    : sort === "calls" ? { calls: { _count: dir } }
    : { id: "asc" };

  const [brands, total, customers] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: {
        brand: true,
        _count: { select: { calls: true } },
        calls: { orderBy: { calledAt: "desc" }, take: 1 },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const qs = (extra: Record<string, any>) => {
    const p = new URLSearchParams();
    if (brandId) p.set("brand", String(brandId));
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    if (sort) { p.set("sort", sort); p.set("dir", dir); }
    Object.entries(extra).forEach(([k, v]) => v != null && p.set(k, String(v)));
    return `/customers?${p.toString()}`;
  };

  const SortTh = ({ k, label, right }: { k: string; label: string; right?: boolean }) => {
    const active = sort === k;
    const nextDir = active && dir === "desc" ? "asc" : "desc";
    const arrow = active ? (dir === "desc" ? " ↓" : " ↑") : "";
    return (
      <th style={{ textAlign: right ? "right" : "left" }}>
        <Link href={qs({ sort: k, dir: nextDir, page: 1 })} style={{ color: active ? "#4338ca" : "inherit", fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>{label}{arrow}</Link>
      </th>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 className="page-title">รายชื่อลูกค้า</h1>
        <Link href="/customers/import" className="btn" style={{ marginLeft: "auto", padding: "7px 14px", background: "linear-gradient(180deg,#0ea5e9,#0284c7)" }}>📤 นำเข้าจากไฟล์</Link>
        <Link href="/customers/new" className="btn" style={{ padding: "7px 14px" }}>➕ เพิ่มลูกค้า</Link>
        <a href={`/api/export/customers?${new URLSearchParams(Object.entries({ brand: sp.brand, status: sp.status, q: sp.q }).filter(([, v]) => v) as any).toString()}`}
          className="btn btn-ghost" style={{ padding: "7px 14px" }}>⬇️ ส่งออก Excel</a>
        {session?.role !== "agent" && (
          <a href={`/api/customers/export?${new URLSearchParams(Object.entries({ brand: sp.brand, q: sp.q }).filter(([, v]) => v) as any).toString()}`}
            className="btn btn-ghost" style={{ padding: "7px 14px" }}>⬇️ ส่งออก CSV</a>
        )}
      </div>

      <form method="get" className="card" style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <input name="q" defaultValue={q} placeholder="🔍 ค้นหาเบอร์โทร" style={{ minWidth: 200 }} />
        <select name="brand" defaultValue={brandId || ""}>
          <option value="">ทุกเว็บ</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select name="status" defaultValue={status}>
          <option value="">ทุกสถานะ</option>
          <option value="active">ขาดฝาก</option>
          <option value="returned">กลับมาฝาก</option>
          <option value="lost">เลิกเล่น</option>
          <option value="do_not_call">🚫 ห้ามโทร</option>
        </select>
        <button className="btn" type="submit">กรอง</button>
        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 14 }}>พบ {total.toLocaleString()} ราย</span>
      </form>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <SortTh k="phone" label="เบอร์โทร" />
              <SortTh k="brand" label="เว็บ" />
              <SortTh k="status" label="สถานะ" />
              <SortTh k="calls" label="จำนวนโทร" right />
              <th>โทรล่าสุด</th><th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.phone}</td>
                <td>{c.brand.name}</td>
                <td><span className={`badge ${badgeFor(c.status)}`}>{statusLabel[c.status]}</span></td>
                <td style={{ textAlign: "right" }}>{c._count.calls}</td>
                <td style={{ color: "#64748b" }}>
                  {c.calls[0] ? new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short" }).format(c.calls[0].calledAt) : "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/customers/${c.id}`} className="btn-ghost btn" style={{ padding: "5px 12px" }}>ดู</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", justifyContent: "center" }}>
          {page > 1 && <Link href={qs({ page: page - 1 })} className="btn btn-ghost">← ก่อนหน้า</Link>}
          <span style={{ fontSize: 14, color: "#64748b" }}>หน้า {page} / {pages}</span>
          {page < pages && <Link href={qs({ page: page + 1 })} className="btn btn-ghost">ถัดไป →</Link>}
        </div>
      )}
    </div>
  );
}
