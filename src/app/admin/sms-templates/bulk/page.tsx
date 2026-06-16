import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import BulkSmsTool from "@/components/BulkSmsTool";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BulkSmsPage() {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const [templates, brands] = await Promise.all([
    prisma.smsTemplate.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <Link href="/admin/sms-templates" style={{ color: "#64748b", fontSize: 14 }}>← กลับคลังข้อความ</Link>
      <h1 className="page-title" style={{ margin: "10px 0 4px" }}>สร้างข้อความหลายเบอร์</h1>
      <p className="page-sub" style={{ marginBottom: 22 }}>แทนค่าเทมเพลตให้หลายเบอร์พร้อมกัน — คัดลอกไปวางในระบบส่ง SMS หรือ Excel ได้</p>
      <BulkSmsTool templates={templates} brands={brands} />
    </div>
  );
}
