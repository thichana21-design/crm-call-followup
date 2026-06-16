// ระบบ template SMS — ฟังก์ชัน pure (ใช้ได้ทั้งฝั่ง server และ client, ไม่มี dependency)

// ตัวแปรที่รองรับ (ใช้แสดงปุ่มแทรกในหน้าจัดการ)
export const SMS_VARS = ["เว็บ", "เบอร์", "โปร"] as const;

/**
 * แทนค่าตัวแปร {{ชื่อ}} ในข้อความด้วยค่าใน context
 * ตัวแปรที่ไม่รู้จัก: คงรูปแบบ {{...}} ไว้ (ให้คนเห็นว่าพิมพ์ผิด ไม่ใช่ลบเงียบ)
 */
export function renderTemplate(body: string, context: Record<string, string>): string {
  return (body || "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, key) => {
    const k = String(key).trim();
    return Object.prototype.hasOwnProperty.call(context, k) ? context[k] : m;
  });
}
