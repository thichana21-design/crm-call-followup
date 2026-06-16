import { prisma } from "@/lib/prisma";
import { cronAuthorized, notifyGroup } from "@/lib/notify";
import { bangkokTodayEnd } from "@/lib/dates";
import { baht } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const todayEnd = bangkokTodayEnd();
  const [queue, due, dueByAgent] = await Promise.all([
    prisma.customer.count({ where: { status: "active" } }),
    prisma.customer.count({ where: { status: "active", nextCallAt: { not: null, lte: todayEnd } } }),
    prisma.customer.groupBy({
      by: ["assignedAgentId"],
      where: { status: "active", nextCallAt: { not: null, lte: todayEnd } },
      _count: { _all: true },
    }),
  ]);

  const agents = await prisma.agent.findMany({ select: { id: true, name: true } });
  const nameOf = new Map(agents.map((a) => [a.id, a.name]));
  const perAgent = dueByAgent
    .filter((g) => g.assignedAgentId != null)
    .map((g) => `• ${nameOf.get(g.assignedAgentId!) || "—"}: นัด ${baht(g._count._all)} ราย`);

  const text =
    `🌅 <b>คิวเช้า</b>\n` +
    `ลูกค้ารอติดตาม: <b>${baht(queue)}</b> ราย\n` +
    `นัดถึงกำหนดวันนี้: <b>${baht(due)}</b> ราย\n` +
    (perAgent.length ? `${"─".repeat(14)}\n${perAgent.join("\n")}` : "");

  await notifyGroup("team", "morning_queue", text);
  return Response.json({ ok: true });
}
