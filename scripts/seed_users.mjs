// สร้างบัญชีผู้ใช้ตัวอย่าง + มอบหมายลูกค้าให้พนักงานแบบวนรอบ
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();
const hash = (pw) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
};

const users = [
  { name: "ผู้ดูแลระบบ", username: "admin", role: "admin", password: "admin123" },
  { name: "หัวหน้าทีม", username: "lead", role: "lead", password: "lead123" },
  { name: "พนักงานโทร 1", username: "agent1", role: "agent", password: "agent123" },
  { name: "พนักงานโทร 2", username: "agent2", role: "agent", password: "agent123" },
];

async function main() {
  const agents = [];
  for (const u of users) {
    const a = await prisma.agent.upsert({
      where: { name: u.name },
      update: { username: u.username, role: u.role, passwordHash: hash(u.password), isActive: true },
      create: { name: u.name, username: u.username, role: u.role, passwordHash: hash(u.password), isActive: true },
    });
    agents.push({ ...a, role: u.role });
    console.log(`  ${u.role.padEnd(6)} | user: ${u.username} | pass: ${u.password}`);
  }

  // มอบหมายลูกค้าให้พนักงาน (role agent) แบบวนรอบ
  const callAgents = agents.filter((a) => a.role === "agent");
  if (callAgents.length) {
    const customers = await prisma.customer.findMany({ select: { id: true }, orderBy: { id: "asc" } });
    let i = 0;
    const batchByAgent = new Map(callAgents.map((a) => [a.id, []]));
    for (const c of customers) {
      const agent = callAgents[i % callAgents.length];
      batchByAgent.get(agent.id).push(c.id);
      i++;
    }
    for (const [agentId, ids] of batchByAgent) {
      // อัปเดตเป็นชุดๆ
      for (let j = 0; j < ids.length; j += 500) {
        const chunk = ids.slice(j, j + 500);
        await prisma.customer.updateMany({ where: { id: { in: chunk } }, data: { assignedAgentId: agentId } });
      }
      console.log(`  มอบหมาย ${ids.length} ลูกค้า -> agentId ${agentId}`);
    }
  }
  console.log("\nเสร็จสิ้น — เข้าสู่ระบบที่ /login");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
