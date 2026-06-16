import { prisma } from "@/lib/prisma";
import AddCustomerForm from "@/components/AddCustomerForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const [brands, agents] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.agent.findMany({ where: { isActive: true, role: "agent" }, orderBy: { id: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <Link href="/customers" style={{ color: "#64748b", fontSize: 14 }}>← กลับรายชื่อ</Link>
      <h1 className="page-title" style={{ margin: "10px 0 22px" }}>เพิ่มลูกค้า</h1>
      <AddCustomerForm brands={brands} agents={agents} />
    </div>
  );
}
