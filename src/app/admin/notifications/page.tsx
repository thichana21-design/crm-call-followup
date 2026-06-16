import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSetting } from "@/lib/sms";
import { NK, NOTIFY_TYPES } from "@/lib/notify";
import { isTelegramConfigured } from "@/lib/telegram";
import { saveNotificationSettings, testSendAction } from "./actions";
import NotificationForm from "@/components/NotificationForm";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session || (session.role !== "lead" && session.role !== "admin")) redirect("/");

  const [team, sup, big, minCalls, ...toggles] = await Promise.all([
    getSetting(NK.teamChatId, ""),
    getSetting(NK.supChatId, ""),
    getSetting(NK.bigDeposit, "5000"),
    getSetting(NK.minCallsAM, "30"),
    ...NOTIFY_TYPES.map((t) => getSetting(`notify_${t.key}`, "on")),
  ]);

  const enabled: Record<string, boolean> = {};
  NOTIFY_TYPES.forEach((t, i) => { enabled[t.key] = toggles[i] === "on"; });

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>ตั้งค่าการแจ้งเตือน Telegram</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>กำหนดกลุ่มรับแจ้งเตือน เกณฑ์ และเปิด/ปิดแต่ละประเภท</p>

      {!isTelegramConfigured() && (
        <div className="card" style={{ padding: 14, marginBottom: 16, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <span style={{ color: "#b45309", fontWeight: 600 }}>⚠️ ยังไม่ได้ตั้ง TELEGRAM_BOT_TOKEN</span>
          <span style={{ color: "#92400e", fontSize: 13 }}> — ตั้งใน .env ก่อนถึงจะส่งได้</span>
        </div>
      )}

      <NotificationForm
        values={{ team, sup, big, minCalls, enabled }}
        save={saveNotificationSettings}
        testSend={testSendAction}
        types={NOTIFY_TYPES}
      />
    </div>
  );
}
