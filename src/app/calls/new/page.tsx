import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import QuickLogForm from "@/components/QuickLogForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QuickLogPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const [brands, agents] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.agent.findMany({ where: { isActive: true, role: "agent" }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <Link href="/calls" style={{ color: "#64748b", fontSize: 14 }}>← กลับบันทึกการโทร</Link>
      <h1 className="page-title" style={{ margin: "10px 0 4px" }}>ลงข้อมูลการโทร</h1>
      <p className="page-sub" style={{ marginBottom: 22 }}>
        บันทึกการโทรย้อนหลังได้ — เลือกวันที่ กรอกเบอร์ ผลการโทร และยอดฝาก บันทึกได้ต่อเนื่องหลายรายการ
      </p>
      <QuickLogForm brands={brands} agents={agents} defaultBrandId={sp.brand ? Number(sp.brand) : undefined} />
    </div>
  );
}
