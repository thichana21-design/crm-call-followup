import { cronAuthorized, notifyGroup } from "@/lib/notify";
import { getBrandSummary } from "@/lib/report";
import { reportPresets } from "@/lib/dates";
import { baht, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

const shift = (d: string, days: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
const chg = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);
const arrow = (n: number) => (n > 0 ? `▲ +${n.toFixed(0)}%` : n < 0 ? `▼ ${n.toFixed(0)}%` : "±0%");

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const ps = reportPresets();
  const [cur, prev] = await Promise.all([
    getBrandSummary(ps.lastWeek.from, ps.lastWeek.to),
    getBrandSummary(shift(ps.lastWeek.from, -7), shift(ps.lastWeek.to, -7)),
  ]);
  const c = cur.total, p = prev.total;

  const text =
    `📈 <b>สรุปสัปดาห์ก่อน</b> (เทียบสัปดาห์ก่อนหน้า)\n` +
    `โทร: <b>${baht(c.calls)}</b> (${arrow(chg(c.calls, p.calls))})\n` +
    `รับสาย: ${pct(c.answerRate)}\n` +
    `กลับมาฝาก: <b>${baht(c.returnedPeople)}</b> คน (${arrow(chg(c.returnedPeople, p.returnedPeople))})\n` +
    `ยอดฝาก: ฿<b>${baht(c.depositTotal)}</b> (${arrow(chg(c.depositTotal, p.depositTotal))})`;

  await notifyGroup("supervisor", "weekly", text);
  return Response.json({ ok: true });
}
