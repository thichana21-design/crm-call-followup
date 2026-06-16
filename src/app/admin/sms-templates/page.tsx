import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSetting, SMS_PROMO_KEY } from "@/lib/sms";
import TemplateEditor from "@/components/TemplateEditor";
import { toggleTemplate, savePromo } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SmsTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const sp = await searchParams;
  const editId = sp.edit ? Number(sp.edit) : undefined;

  const [templates, promo, editing] = await Promise.all([
    prisma.smsTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    getSetting(SMS_PROMO_KEY, ""),
    editId ? prisma.smsTemplate.findUnique({ where: { id: editId } }) : Promise.resolve(null),
  ]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <h1 className="page-title">คลังข้อความ SMS</h1>
        <Link href="/admin/sms-templates/bulk" className="btn" style={{ marginLeft: "auto", padding: "7px 14px" }}>📨 สร้างข้อความหลายเบอร์</Link>
      </div>
      <p className="page-sub" style={{ marginBottom: 22 }}>เทมเพลตข้อความกลางสำหรับพนักงานคัดลอกไปส่ง SMS เอง — ใส่ตัวแปร {`{{เว็บ}} {{เบอร์}} {{โปร}}`} ได้</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18 }}>
          {/* ข้อความโปรปัจจุบัน */}
          <form action={savePromo} className="card" style={{ padding: 18 }}>
            <div className="section-title" style={{ padding: 0, border: "none", marginBottom: 10 }}>🎁 ข้อความโปรปัจจุบัน</div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>ค่าที่จะแทนใน {`{{โปร}}`} ของทุก template</p>
            <input name="promo" defaultValue={promo} placeholder="เช่น โบนัส 20% สูงสุด 500 บาท" style={{ width: "100%", marginBottom: 10 }} />
            <button type="submit" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>บันทึกข้อความโปร</button>
          </form>

          {/* รายการ template */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="section-title">📋 Template ทั้งหมด ({templates.length})</div>
            <table>
              <thead><tr><th style={{ textAlign: "right" }}>ลำดับ</th><th>ชื่อ</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{t.sortOrder}</td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td><span className={`badge ${t.active ? "badge-green" : "badge-slate"}`}>{t.active ? "ใช้งาน" : "ปิด"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/admin/sms-templates?edit=${t.id}`} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>แก้ไข</Link>
                        <form action={toggleTemplate}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>{t.active ? "ปิด" : "เปิด"}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>ยังไม่มี template</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ฟอร์มเพิ่ม/แก้ไข */}
        <div style={{ display: "grid", gap: 12 }}>
          {editing && <Link href="/admin/sms-templates" style={{ fontSize: 13, color: "#4338ca" }}>+ เพิ่มอันใหม่แทน</Link>}
          <TemplateEditor key={editing?.id ?? "new"} template={editing ?? undefined} promo={promo} />
        </div>
      </div>
    </div>
  );
}
