// สำรองข้อมูลทั้งหมดจากฐานข้อมูลปัจจุบัน -> data/db_snapshot.json
// รันตอนที่ schema ยังเป็น SQLite (ก่อนย้ายไป Postgres)
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const [brands, agents, customers, calls, deposits, bonuses] = await Promise.all([
    prisma.brand.findMany(),
    prisma.agent.findMany(),
    prisma.customer.findMany(),
    prisma.call.findMany(),
    prisma.deposit.findMany(),
    prisma.bonusAdjustment.findMany(),
  ]);

  const snapshot = { brands, agents, customers, calls, deposits, bonuses };
  const out = path.join(__dirname, "..", "data", "db_snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot), "utf-8");

  console.log("สำรองข้อมูลสำเร็จ ->", out);
  console.log(`  brands: ${brands.length}`);
  console.log(`  agents: ${agents.length}`);
  console.log(`  customers: ${customers.length}`);
  console.log(`  calls: ${calls.length}`);
  console.log(`  deposits: ${deposits.length}`);
  console.log(`  bonuses: ${bonuses.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
