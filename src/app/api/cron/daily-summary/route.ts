import { cronAuthorized, notifyGroup } from "@/lib/notify";
import { getBrandSummary } from "@/lib/report";
import { thaiToday } from "@/lib/dates";
import { baht, pct } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });

  const today = thaiToday();
  const r = await getBrandSummary(today, today);
  const t = r.total;
  const lines = r.rows
    .filter((x) => x.calls > 0 || x.depositTotal > 0)
    .map((x) => `• ${x.brandName}: โทร ${baht(x.calls)} | กลับมาฝาก ${baht(x.returnedPeople)} คน ฿${baht(x.depositTotal)}`);

  const text =
    `📊 <b>สรุปวันนี้</b> (${new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date())})\n` +
    `โทร <b>${baht(t.calls)}</b> · รับสาย ${baht(t.answered)} (${pct(t.answerRate)})\n` +
    `กลับมาฝาก <b>${baht(t.returnedPeople)}</b> คน · ยอด ฿<b>${baht(t.depositTotal)}</b>\n` +
    `${"─".repeat(14)}\n${lines.join("\n") || "(ไม่มีกิจกรรมวันนี้)"}`;

  await notifyGroup("team", "daily", text);
  return Response.json({ ok: true, date: today });
}
