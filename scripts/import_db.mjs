// กู้คืนข้อมูลจาก data/db_snapshot.json -> ฐานข้อมูล (Postgres/Supabase)
// คงค่า id เดิม + รีเซ็ต sequence ให้ถูกต้อง
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function main() {
  const snap = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "db_snapshot.json"), "utf-8"));

  console.log("ล้างตารางปลายทางก่อน...");
  await prisma.deposit.deleteMany();
  await prisma.call.deleteMany();
  await prisma.bonusAdjustment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.brand.deleteMany();

  const fixDates = (rows, fields) =>
    rows.map((r) => {
      const o = { ...r };
      for (const f of fields) if (o[f]) o[f] = new Date(o[f]);
      return o;
    });

  console.log("กำลังนำเข้า...");
  await prisma.brand.createMany({ data: fixDates(snap.brands, ["createdAt"]) });
  await prisma.agent.createMany({ data: snap.agents });
  for (const c of chunk(fixDates(snap.customers, ["createdAt", "nextCallAt"]), 1000))
    await prisma.customer.createMany({ data: c });
  for (const c of chunk(fixDates(snap.calls, ["calledAt", "createdAt"]), 1000))
    await prisma.call.createMany({ data: c });
  for (const c of chunk(fixDates(snap.deposits, ["depositDate"]), 1000))
    await prisma.deposit.createMany({ data: c });
  if (snap.bonuses?.length)
    await prisma.bonusAdjustment.createMany({ data: fixDates(snap.bonuses, ["adjustedAt"]) });

  // รีเซ็ต sequence ของ id ให้ตรงกับค่าสูงสุด (Postgres)
  const tables = [
    ["Brand", "id"], ["Agent", "id"], ["Customer", "id"],
    ["Call", "id"], ["Deposit", "id"], ["BonusAdjustment", "id"],
  ];
  for (const [t] of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1), true)`
    );
  }

  const counts = {
    brands: await prisma.brand.count(),
    agents: await prisma.agent.count(),
    customers: await prisma.customer.count(),
    calls: await prisma.call.count(),
    deposits: await prisma.deposit.count(),
  };
  console.log("นำเข้าสำเร็จ:", counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
