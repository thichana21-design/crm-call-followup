import { prisma } from "@/lib/prisma";

export type AuditInput = {
  agentId?: number | null;
  agentName?: string | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: any;
  after?: any;
};

/**
 * บันทึก audit log — ทุกจุดเรียกผ่านฟังก์ชันนี้เท่านั้น
 * นโยบาย: ถ้าเขียน log ไม่สำเร็จ จะไม่ทำให้งานหลักพัง (log หายดีกว่างานพัง)
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        agentId: input.agentId ?? null,
        agentName: input.agentName ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    });
  } catch (e) {
    console.error("[audit] บันทึก log ไม่สำเร็จ:", input.action, e);
  }
}
