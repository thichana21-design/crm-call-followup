import { prisma } from "@/lib/prisma";
import { cronAuthorized, notifyGroup, NK } from "@/lib/notify";
import { getSetting } from "@/lib/sms";
import { baht } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const threshold = Number(await getSetting(NK.minCallsAM, "30"));
  const today = new Date(new Date().getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const callFrom = new Date(`${today}T00:00:00+07:00`);
  const callToExcl = new Date(callFrom.getTime() + 24 * 3600 * 1000);

  // พนักงานโทรที่ใช้งานอยู่ทุกคน + นับสายวันนี้ (0 ถ้าไม่มี)
  const [agents, counts] = await Promise.all([
    prisma.agent.findMany({ where: { isActive: true, role: "agent" }, select: { id: true, name: true } }),
    prisma.call.groupBy({ by: ["agentId"], where: { calledAt: { gte: callFrom, lt: callToExcl } }, _count: { _all: true } }),
  ]);
  const byAgent = new Map(counts.map((c) => [c.agentId, c._count._all]));

  const slow = agents
    .map((a) => ({ name: a.name, calls: byAgent.get(a.id) || 0 }))
    .filter((a) => a.calls < threshold)
    .sort((a, b) => a.calls - b.calls);

  if (slow.length === 0) return Response.json({ ok: true, slow: 0, note: "ทุกคนถึงเกณฑ์" });

  const text =
    `🐌 <b>เตือนวันเงียบ</b> (เกณฑ์ ${threshold} สาย/วัน)\n` +
    `พนักงานที่โทรน้อยกว่าเกณฑ์วันนี้:\n` +
    slow.map((a) => `• ${a.name}: ${baht(a.calls)} สาย`).join("\n");

  await notifyGroup("supervisor", "slow_day", text);
  return Response.json({ ok: true, slow: slow.length });
}
