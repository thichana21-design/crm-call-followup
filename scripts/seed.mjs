// นำเข้าข้อมูลจาก data/import.json -> ฐานข้อมูล SQLite ผ่าน Prisma
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function dt(d) {
  return d ? new Date(d + "T00:00:00.000Z") : null;
}

async function main() {
  const raw = readFileSync(path.join(__dirname, "..", "data", "import.json"), "utf-8");
  const data = JSON.parse(raw);

  const APPEND = process.env.IMPORT_MODE === "append";
  if (APPEND) {
    console.log("โหมดเพิ่มข้อมูล (ไม่ลบของเดิม)...");
  } else {
    console.log("ล้างข้อมูลเดิม... (ตั้ง IMPORT_MODE=append เพื่อเพิ่มแทนการล้าง)");
    await prisma.deposit.deleteMany();
    await prisma.call.deleteMany();
    await prisma.bonusAdjustment.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.brand.deleteMany();
  }

  let totalC = 0, totalCalls = 0, totalDep = 0;

  for (const b of data.brands) {
    const brand = await prisma.brand.upsert({
      where: { name: b.name }, update: {}, create: { name: b.name },
    });

    // กันเบอร์ซ้ำในแบรนด์เดียวกัน
    const seen = new Set();
    const uniqueCust = b.customers
      .filter((c) => { if (seen.has(c.phone)) return false; seen.add(c.phone); return true; })
      .map((c) => ({
        brandId: brand.id,
        phone: c.phone,
        status: c.deposits && c.deposits.length ? "returned" : "active",
      }));

    if (APPEND) {
      // ข้ามเบอร์ที่มีอยู่แล้ว สร้างเฉพาะรายใหม่
      const existing = await prisma.customer.findMany({ where: { brandId: brand.id }, select: { phone: true } });
      const have = new Set(existing.map((e) => e.phone));
      const toCreate = uniqueCust.filter((c) => !have.has(c.phone));
      if (toCreate.length) await prisma.customer.createMany({ data: toCreate });
    } else {
      await prisma.customer.createMany({ data: uniqueCust });
    }

    // ดึง id กลับมา map ตามเบอร์
    const created = await prisma.customer.findMany({
      where: { brandId: brand.id },
      select: { id: true, phone: true },
    });
    const idByPhone = new Map(created.map((c) => [c.phone, c.id]));

    const calls = [];
    const deposits = [];
    for (const c of b.customers) {
      const cid = idByPhone.get(c.phone);
      if (!cid) continue;
      for (const call of c.calls || []) {
        if (!call.calledAt) continue;
        calls.push({
          customerId: cid,
          calledAt: dt(call.calledAt),
          callTime: call.callTime || null,
          outcome: call.outcome,
          smsSent: !!call.smsSent,
        });
      }
      for (const dep of c.deposits || []) {
        deposits.push({
          customerId: cid,
          depositDate: dt(dep.depositDate),
          loggedIn: !!dep.loggedIn,
          amount: dep.amount || 0,
        });
      }
    }
    if (calls.length) await prisma.call.createMany({ data: calls });
    if (deposits.length) await prisma.deposit.createMany({ data: deposits });

    totalC += uniqueCust.length;
    totalCalls += calls.length;
    totalDep += deposits.length;
    console.log(`  ${b.name}: ${uniqueCust.length} ลูกค้า, ${calls.length} การโทร, ${deposits.length} ฝาก`);
  }

  // สร้างพนักงานตัวอย่าง
  await prisma.agent.createMany({
    data: [
      { name: "ผู้ดูแลระบบ", role: "admin" },
      { name: "พนักงานโทร 1", role: "agent" },
      { name: "พนักงานโทร 2", role: "agent" },
    ],
  });

  console.log(`\nเสร็จสิ้น: ${totalC} ลูกค้า, ${totalCalls} การโทร, ${totalDep} ฝาก`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
