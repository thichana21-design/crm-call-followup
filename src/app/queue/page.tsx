import { prisma } from "@/lib/prisma";
import { fmtDate, outcomeLabel } from "@/lib/format";
import { bangkokTodayEnd, formatThaiDateTime } from "@/lib/dates";
import { getSession } from "@/lib/auth";
import Pagination from "@/components/Pagination";
import Link from "next/link";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const brandId = sp.brand ? Number(sp.brand) : undefined;
  const q = (sp.q || "").trim();
  const outcome = sp.outcome || "";        // ผลสายล่าสุด
  const callcount = sp.callcount || "";    // none | 1 | 2 | 3plus
  const due = sp.due === "1";              // โหมด "ถึงนัดวันนี้"
  const page = Math.max(1, Number(sp.page) || 1);
  const agentId = session?.role === "agent" ? session.sub : undefined;
  const sort = sp.sort || "";              // calls | lastcall
  const dir = sp.dir === "asc" ? "asc" : "desc";

  const todayEnd = bangkokTodayEnd();
  const now = Date.now();

  // จำนวน "นัดถึงกำหนด" ของผู้ใช้ (สำหรับ badge บนแท็บ)
  const myDueCount = await prisma.customer.count({
    where: {
      status: "active",
      nextCallAt: { not: null, lte: todayEnd },
      ...(agentId ? { assignedAgentId: agentId } : {}),
    },
  });

  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  let customers: any[] = [];
  let total = 0;

  if (due) {
    // โหมดนัด: ใช้ Prisma (เทียบ DateTime ตรงชนิด) เรียงตามเวลานัด
    const dueWhere: any = {
      status: "active",
      nextCallAt: { not: null, lte: todayEnd },
      ...(brandId ? { brandId } : {}),
      ...(agentId ? { assignedAgentId: agentId } : {}),
      ...(q ? { phone: { contains: q } } : {}),
    };
    total = await prisma.customer.count({ where: dueWhere });
    customers = await prisma.customer.findMany({
      where: dueWhere,
      include: { brand: true, _count: { select: { calls: true } }, calls: { orderBy: { calledAt: "desc" }, take: 1 } },
      orderBy: { nextCallAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  } else {
    // โหมดปกติ: raw SQL (Postgres) — ครอบ column camelCase ด้วย " และใช้ placeholder $N
    let pIdx = 0;
    const ph = () => `$${++pIdx}`;
    const baseConds: string[] = [`c."status" = ${ph()}`];
    const baseParams: any[] = ["active"];
    if (brandId) { baseConds.push(`c."brandId" = ${ph()}`); baseParams.push(brandId); }
    if (agentId) { baseConds.push(`c."assignedAgentId" = ${ph()}`); baseParams.push(agentId); }
    if (q) { baseConds.push(`c."phone" LIKE ${ph()}`); baseParams.push(`%${q}%`); }

    const outerConds: string[] = [];
    const outerParams: any[] = [];
    if (outcome) { outerConds.push(`t."lastOutcome" = ${ph()}`); outerParams.push(outcome); }
    if (callcount === "none") outerConds.push(`t."callCount" = 0`);
    else if (callcount === "1") outerConds.push(`t."callCount" = 1`);
    else if (callcount === "2") outerConds.push(`t."callCount" = 2`);
    else if (callcount === "3plus") outerConds.push(`t."callCount" >= 3`);

    const inner = `
      SELECT c."id" AS id,
        (SELECT COUNT(*) FROM "Call" ca WHERE ca."customerId" = c."id") AS "callCount",
        (SELECT ca."outcome" FROM "Call" ca WHERE ca."customerId" = c."id" ORDER BY ca."calledAt" DESC, ca."id" DESC LIMIT 1) AS "lastOutcome",
        (SELECT ca."calledAt" FROM "Call" ca WHERE ca."customerId" = c."id" ORDER BY ca."calledAt" DESC, ca."id" DESC LIMIT 1) AS "lastCalledAt"
      FROM "Customer" c WHERE ${baseConds.join(" AND ")}
    `;
    const outerWhere = outerConds.length ? `WHERE ${outerConds.join(" AND ")}` : "";
    // เรียงลำดับ (whitelist คอลัมน์+ทิศทาง กัน SQL injection) ; ค่าเริ่มต้น = โทรนานสุดก่อน
    const sqlDir = dir === "asc" ? "ASC" : "DESC";
    const orderClause =
      sort === "calls" ? `t."callCount" ${sqlDir}, t.id ASC`
      : sort === "lastcall" ? `t."lastCalledAt" ${sqlDir}, t.id ASC`
      : `t."lastCalledAt" ASC, t.id ASC`;
    const countSql = `SELECT COUNT(*) AS cnt FROM (${inner}) t ${outerWhere}`;
    const limitPh = ph(); const offsetPh = ph();
    const pageSql = `SELECT t.id AS id FROM (${inner}) t ${outerWhere} ORDER BY ${orderClause} LIMIT ${limitPh} OFFSET ${offsetPh}`;

    const [countRows, idRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: number | bigint }[]>(countSql, ...baseParams, ...outerParams),
      prisma.$queryRawUnsafe<{ id: number }[]>(pageSql, ...baseParams, ...outerParams, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    ]);
    total = Number(countRows[0]?.cnt || 0);
    const ids = idRows.map((r) => Number(r.id));
    const rows = ids.length
      ? await prisma.customer.findMany({
          where: { id: { in: ids } },
          include: { brand: true, _count: { select: { calls: true } }, calls: { orderBy: { calledAt: "desc" }, take: 1 } },
        })
      : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    customers = ids.map((id) => byId.get(id)).filter(Boolean);
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const qs = (extra: Record<string, any>) => {
    const p = new URLSearchParams();
    if (due) p.set("due", "1");
    if (brandId) p.set("brand", String(brandId));
    if (q) p.set("q", q);
    if (!due && outcome) p.set("outcome", outcome);
    if (!due && callcount) p.set("callcount", callcount);
    if (!due && sort) { p.set("sort", sort); p.set("dir", dir); }
    Object.entries(extra).forEach(([k, v]) => v != null && v !== "" && p.set(k, String(v)));
    return `/queue?${p.toString()}`;
  };

  // หัวคอลัมน์คลิกเรียง (เฉพาะโหมดคิวปกติ)
  const SortTh = ({ k, label, left }: { k: string; label: string; left?: boolean }) => {
    const active = sort === k;
    const nextDir = active && dir === "desc" ? "asc" : "desc";
    const arrow = active ? (dir === "desc" ? " ↓" : " ↑") : "";
    return (
      <th style={{ textAlign: left ? "left" : "right" }}>
        <Link href={qs({ sort: k, dir: nextDir, page: 1 })} style={{ color: active ? "#4338ca" : "inherit", fontWeight: active ? 700 : 600, whiteSpace: "nowrap" }}>{label}{arrow}</Link>
      </th>
    );
  };

  const apptBadge = (d: Date | null) => {
    if (!d) return null;
    const t = d.getTime();
    if (t < now) return <span className="badge badge-red">เลยนัด</span>;
    if (t <= todayEnd.getTime()) return <span className="badge badge-amber">นัดวันนี้</span>;
    return <span className="badge badge-slate">นัดล่วงหน้า</span>;
  };

  return (
    <div>
      <h1 className="page-title">คิวโทรติดตาม</h1>
      <p className="page-sub" style={{ marginBottom: 14 }}>
        {due ? "รายการที่ถึงกำหนดนัดโทร (วันนี้หรือเลยมาแล้ว)" : "ลูกค้าที่ยัง “ขาดฝาก” รอการติดตาม"} — ทั้งหมด {total.toLocaleString()} รายการ
      </p>

      {/* แท็บ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Link href="/queue" className={`btn ${due ? "btn-ghost" : ""}`} style={{ padding: "7px 16px" }}>คิวทั้งหมด</Link>
        <Link href="/queue?due=1" className={`btn ${due ? "" : "btn-ghost"}`} style={{ padding: "7px 16px" }}>
          🔔 ถึงนัดวันนี้{myDueCount > 0 ? ` (${myDueCount})` : ""}
        </Link>
      </div>

      <form method="get" className="card" style={{ padding: 14, display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        {due && <input type="hidden" name="due" value="1" />}
        <input name="q" defaultValue={q} placeholder="🔍 ค้นหาเบอร์โทร" style={{ minWidth: 170 }} />
        <select name="brand" defaultValue={brandId || ""}>
          <option value="">ทุกเว็บ</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {!due && (
          <>
            <select name="outcome" defaultValue={outcome}>
              <option value="">ผลสายล่าสุด: ทั้งหมด</option>
              <option value="answered">รับสาย</option>
              <option value="no_answer">ไม่รับสาย</option>
              <option value="unreachable">ติดต่อไม่ได้</option>
              <option value="refused">ปฏิเสธ</option>
            </select>
            <select name="callcount" defaultValue={callcount}>
              <option value="">จำนวนโทร: ทั้งหมด</option>
              <option value="none">ยังไม่เคยโทร</option>
              <option value="1">1 ครั้ง</option>
              <option value="2">2 ครั้ง</option>
              <option value="3plus">3 ครั้งขึ้นไป</option>
            </select>
          </>
        )}
        <button className="btn" type="submit">กรอง</button>
        <Link href={due ? "/queue?due=1" : "/queue"} className="btn btn-ghost">ล้าง</Link>
      </form>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>เบอร์โทร</th><th>เว็บ</th>
              {due ? <th style={{ textAlign: "right" }}>จำนวนโทร</th> : <SortTh k="calls" label="จำนวนโทร" />}
              {due ? <th>เวลานัด</th> : <><SortTh k="lastcall" label="โทรล่าสุด" left /><th>ผลล่าสุด</th></>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.phone}</td>
                <td>{c.brand.name}</td>
                <td style={{ textAlign: "right" }}>{c._count.calls}</td>
                {due ? (
                  <td><span style={{ marginRight: 8 }}>{formatThaiDateTime(c.nextCallAt)}</span>{apptBadge(c.nextCallAt)}</td>
                ) : (
                  <>
                    <td style={{ color: "#64748b" }}>{c.calls[0] ? fmtDate(c.calls[0].calledAt) : "ยังไม่เคยโทร"}{c.nextCallAt ? <> {apptBadge(c.nextCallAt)}</> : null}</td>
                    <td>{c.calls[0] ? outcomeLabel[c.calls[0].outcome] : "—"}</td>
                  </>
                )}
                <td style={{ textAlign: "right" }}>
                  <Link href={`/customers/${c.id}`} className="btn" style={{ padding: "5px 14px" }}>📞 โทร</Link>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={due ? 5 : 6} style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>ไม่มีคิวตามเงื่อนไขที่กรอง</td></tr>}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} pageSize={PAGE_SIZE} makeHref={(p) => qs({ page: p })} />
    </div>
  );
}
