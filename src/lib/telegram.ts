// ส่งข้อความผ่าน Telegram Bot API — token เก็บใน .env (TELEGRAM_BOT_TOKEN)
// ห้าม hardcode token ในโค้ด

export function isTelegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendTelegram(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "ยังไม่ได้ตั้งค่า TELEGRAM_BOT_TOKEN" };
  if (!chatId) return { ok: false, error: "ไม่มี Telegram chat id" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || "ส่งไม่สำเร็จ" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "เชื่อมต่อ Telegram ไม่ได้" };
  }
}
