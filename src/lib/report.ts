import { prisma } from "@/lib/prisma";

export type BrandReportRow = {
  brandId: number;
  brandName: string;
  calls: number;
  answered: number;
  noAnswer: number;
  answerRate: number;
  noAnswerRate: number;
  returnedPeople: number; // ลูกค้า distinct ที่กลับมาฝากในช่วง
  depositTotal: number;
  bonusTotal: number;
  bonusPerDepositPct: number;
};

export type BrandReport = {
  from: string;
  to: string;
  rows: BrandReportRow[];
  total: Omit<BrandReportRow, "brandId" | "brandName">;
};

/**
 * สรุปผลรายเว็บในช่วงวันที่ (from/to = "YYYY-MM-DD" ตามปฏิทินไทย, รวมวันสุดท้าย)
 * - calledAt = timestamp -> ใช้ขอบวันเวลาไทย (+07:00)
 * - depositDate = date-only (UTC midnight) -> เทียบเป็นวันที่ UTC midnight ตรง ๆ
 */
export async function getBrandSummary(from: string, to: string): Promise<BrandReport> {
  const callFrom = new Date(`${from}T00:00:00+07:00`);
  const callToExcl = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000);
  const depFrom = new Date(`${from}T00:00:00.000Z`);
  const depTo = new Date(`${to}T00:00:00.000Z`);

  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });

  const rows: BrandReportRow[] = await Promise.all(
    brands.map(async (b) => {
      const callWhere = { customer: { brandId: b.id }, calledAt: { gte: callFrom, lt: callToExcl } };
      const depWhere = { customer: { brandId: b.id }, depositDate: { gte: depFrom, lte: depTo }, amount: { gt: 0 } };

      const [calls, answered, depAgg, distinctDep, bonusAgg] = await Promise.all([
        prisma.call.count({ where: callWhere }),
        prisma.call.count({ where: { ...callWhere, outcome: "answered" } }),
        prisma.deposit.aggregate({ where: depWhere, _sum: { amount: true } }),
        prisma.deposit.findMany({ where: depWhere, select: { customerId: true }, distinct: ["customerId"] }),
        prisma.bonusAdjustment.aggregate({
          where: { customer: { brandId: b.id }, adjustedAt: { gte: depFrom, lte: depTo } },
          _sum: { amount: true },
        }),
      ]);

      const noAnswer = calls - answered;
      const depositTotal = depAgg._sum.amount || 0;
      const bonusTotal = bonusAgg._sum.amount || 0;
      return {
        brandId: b.id,
        brandName: b.name,
        calls,
        answered,
        noAnswer,
        answerRate: calls ? answered / calls : 0,
        noAnswerRate: calls ? noAnswer / calls : 0,
        returnedPeople: distinctDep.length,
        depositTotal,
        bonusTotal,
        bonusPerDepositPct: depositTotal ? bonusTotal / depositTotal : 0,
      };
    })
  );

  const sum = rows.reduce(
    (a, r) => ({
      calls: a.calls + r.calls,
      answered: a.answered + r.answered,
      noAnswer: a.noAnswer + r.noAnswer,
      returnedPeople: a.returnedPeople + r.returnedPeople,
      depositTotal: a.depositTotal + r.depositTotal,
      bonusTotal: a.bonusTotal + r.bonusTotal,
    }),
    { calls: 0, answered: 0, noAnswer: 0, returnedPeople: 0, depositTotal: 0, bonusTotal: 0 }
  );

  const total = {
    ...sum,
    answerRate: sum.calls ? sum.answered / sum.calls : 0,
    noAnswerRate: sum.calls ? sum.noAnswer / sum.calls : 0,
    bonusPerDepositPct: sum.depositTotal ? sum.bonusTotal / sum.depositTotal : 0,
  };

  return { from, to, rows, total };
}

export type CohortRow = {
  brandId: number;
  brandName: string;
  called: number;
  d3: number; d7: number; d14: number; d31: number;
  depTotal: number;
};

/**
 * Cohort conversion: ลูกค้านับจาก "การโทรครั้งแรก" ในช่วง แล้วดูว่ากลับมาฝาก (amount>0)
 * ภายใน 3/7/14/31 วันหลังวันโทรหรือไม่ (distinct ต่อคน, monotonic)
 * - เวลาไทย: (calledAt AT TIME ZONE 'Asia/Bangkok')::date
 * - กันฝากก่อนวันโทร: depositDate::date >= first_date
 * - SQL เดียว (CTE) รันกับลูกค้าทั้งหมดในไม่กี่วินาที
 */
export async function getCohortReport(from: string, to: string) {
  const callFrom = new Date(`${from}T00:00:00+07:00`);
  const callToExcl = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000);

  const sql = `
    WITH first_call AS (
      SELECT c."customerId" AS cid,
             cu."brandId"   AS brand_id,
             MIN((c."calledAt" AT TIME ZONE 'Asia/Bangkok')::date) AS first_date
      FROM "Call" c
      JOIN "Customer" cu ON cu."id" = c."customerId"
      WHERE c."calledAt" >= $1 AND c."calledAt" < $2
      GROUP BY c."customerId", cu."brandId"
    ),
    conv AS (
      SELECT fc.brand_id, fc.cid,
        MIN(CASE WHEN d.amount > 0 AND d."depositDate"::date >= fc.first_date
                 THEN (d."depositDate"::date - fc.first_date) END) AS days_to_dep,
        COALESCE(SUM(CASE WHEN d.amount > 0
                 AND d."depositDate"::date >= fc.first_date
                 AND d."depositDate"::date <= fc.first_date + 31
                 THEN d.amount ELSE 0 END), 0) AS dep31
      FROM first_call fc
      LEFT JOIN "Deposit" d ON d."customerId" = fc.cid
      GROUP BY fc.brand_id, fc.cid
    )
    SELECT b."id" AS "brandId", b."name" AS "brandName",
      COUNT(*)                                    AS called,
      COUNT(*) FILTER (WHERE days_to_dep <= 3)    AS d3,
      COUNT(*) FILTER (WHERE days_to_dep <= 7)    AS d7,
      COUNT(*) FILTER (WHERE days_to_dep <= 14)   AS d14,
      COUNT(*) FILTER (WHERE days_to_dep <= 31)   AS d31,
      COALESCE(SUM(dep31), 0)                     AS dep_total
    FROM conv
    JOIN "Brand" b ON b."id" = conv.brand_id
    GROUP BY b."id", b."name"
    ORDER BY b."name";
  `;

  const raw = await prisma.$queryRawUnsafe<any[]>(sql, callFrom, callToExcl);
  const rows: CohortRow[] = raw.map((r) => ({
    brandId: Number(r.brandId),
    brandName: r.brandName,
    called: Number(r.called),
    d3: Number(r.d3), d7: Number(r.d7), d14: Number(r.d14), d31: Number(r.d31),
    depTotal: Number(r.dep_total),
  }));

  const total = rows.reduce(
    (s, r) => ({
      called: s.called + r.called, d3: s.d3 + r.d3, d7: s.d7 + r.d7,
      d14: s.d14 + r.d14, d31: s.d31 + r.d31, depTotal: s.depTotal + r.depTotal,
    }),
    { called: 0, d3: 0, d7: 0, d14: 0, d31: 0, depTotal: 0 }
  );

  // cohort ยังไม่ครบกำหนด ถ้า (วันจบช่วง + 31 วัน) เลยวันนี้
  const todayTh = new Date(new Date().getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const windowEnd = new Date(new Date(`${to}T00:00:00Z`).getTime() + 31 * 86400000).toISOString().slice(0, 10);
  const incomplete = windowEnd > todayTh;

  return { from, to, rows, total, incomplete, windowEnd, today: todayTh };
}

export type AgentReportRow = {
  agentId: number | null;
  agentName: string;
  calls: number;
  answered: number;
  answerRate: number;
  sms: number;
  returnedPeople: number;
  depositTotal: number;
};

/**
 * ผลงานรายพนักงานในช่วงวันที่ (from/to = YYYY-MM-DD ปฏิทินไทย)
 * - callerId = Call.agentId ; สายที่ agentId = null = "ไม่ระบุผู้โทร (ข้อมูลนำเข้า)"
 * - "ลูกค้ากลับมาฝาก" นับให้พนักงานที่โทรครั้งล่าสุดก่อน/ในวันที่ฝาก (ในช่วง)
 */
export async function getAgentReport(from: string, to: string) {
  const callFrom = new Date(`${from}T00:00:00+07:00`);
  const callToExcl = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 24 * 3600 * 1000);
  const depFrom = new Date(`${from}T00:00:00.000Z`);
  const depTo = new Date(`${to}T00:00:00.000Z`);
  const callWhere = { calledAt: { gte: callFrom, lt: callToExcl } };

  const [callG, ansG, smsG, agents, deposits] = await Promise.all([
    prisma.call.groupBy({ by: ["agentId"], where: callWhere, _count: { _all: true } }),
    prisma.call.groupBy({ by: ["agentId"], where: { ...callWhere, outcome: "answered" }, _count: { _all: true } }),
    prisma.call.groupBy({ by: ["agentId"], where: { ...callWhere, smsSent: true }, _count: { _all: true } }),
    prisma.agent.findMany({ select: { id: true, name: true } }),
    prisma.deposit.findMany({ where: { depositDate: { gte: depFrom, lte: depTo }, amount: { gt: 0 } }, select: { customerId: true, depositDate: true, amount: true } }),
  ]);

  const nameOf = new Map(agents.map((a) => [a.id, a.name]));
  const key = (id: number | null) => (id == null ? "null" : String(id));

  type Acc = { agentId: number | null; calls: number; answered: number; sms: number; custSet: Set<number>; depositTotal: number };
  const acc = new Map<string, Acc>();
  const ensure = (id: number | null) => {
    const k = key(id);
    if (!acc.has(k)) acc.set(k, { agentId: id, calls: 0, answered: 0, sms: 0, custSet: new Set(), depositTotal: 0 });
    return acc.get(k)!;
  };
  for (const g of callG) ensure(g.agentId).calls = g._count._all;
  for (const g of ansG) ensure(g.agentId).answered = g._count._all;
  for (const g of smsG) ensure(g.agentId).sms = g._count._all;

  // attribution ยอดฝาก: หาสายล่าสุด (ในช่วง) ที่โทรก่อน/ในวันฝาก ของลูกค้าแต่ละราย
  const custIds = [...new Set(deposits.map((d) => d.customerId))];
  const callsForDep = custIds.length
    ? await prisma.call.findMany({ where: { customerId: { in: custIds }, ...callWhere }, select: { customerId: true, agentId: true, calledAt: true } })
    : [];
  const callsByCust = new Map<number, { agentId: number | null; calledAt: Date }[]>();
  for (const c of callsForDep) {
    if (!callsByCust.has(c.customerId)) callsByCust.set(c.customerId, []);
    callsByCust.get(c.customerId)!.push({ agentId: c.agentId, calledAt: c.calledAt });
  }
  for (const dep of deposits) {
    const depDayEnd = new Date(dep.depositDate.getTime() + 24 * 3600 * 1000); // ถึงสิ้นวันฝาก
    const calls = (callsByCust.get(dep.customerId) || []).filter((c) => c.calledAt < depDayEnd);
    let creditAgent: number | null = null;
    if (calls.length) {
      calls.sort((a, b) => b.calledAt.getTime() - a.calledAt.getTime());
      creditAgent = calls[0].agentId; // คนที่โทรล่าสุดก่อน/ในวันฝาก
    }
    const a = ensure(creditAgent);
    a.custSet.add(dep.customerId);
    a.depositTotal += dep.amount;
  }

  let rows: AgentReportRow[] = [...acc.values()].map((a) => ({
    agentId: a.agentId,
    agentName: a.agentId == null ? "ไม่ระบุผู้โทร (ข้อมูลนำเข้า)" : (nameOf.get(a.agentId) || `#${a.agentId}`),
    calls: a.calls,
    answered: a.answered,
    answerRate: a.calls ? a.answered / a.calls : 0,
    sms: a.sms,
    returnedPeople: a.custSet.size,
    depositTotal: a.depositTotal,
  }));
  // แสดงเฉพาะที่มีผลงาน (โทร หรือ ฝากที่ถูก attribute)
  rows = rows.filter((r) => r.calls > 0 || r.returnedPeople > 0);

  const total = rows.reduce(
    (s, r) => ({
      calls: s.calls + r.calls,
      answered: s.answered + r.answered,
      sms: s.sms + r.sms,
      returnedPeople: s.returnedPeople + r.returnedPeople,
      depositTotal: s.depositTotal + r.depositTotal,
      answerRate: 0,
    }),
    { calls: 0, answered: 0, sms: 0, returnedPeople: 0, depositTotal: 0, answerRate: 0 }
  );
  total.answerRate = total.calls ? total.answered / total.calls : 0;

  return { from, to, rows, total };
}
