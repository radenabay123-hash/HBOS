import { db } from "../src/lib/db";
import { KPI_TARGETS } from "../src/lib/kpi-targets";

async function main() {
  console.log("Seeding KPI Log data...");

  const teamUsers = await db.user.findMany({
    where: { role: { in: ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] }, isActive: true },
    select: { id: true, name: true, role: true },
  });

  const now = new Date();
  let inserted = 0;

  // Seed KPI logs for the last 14 days (daily metrics)
  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(10, 0, 0, 0);

    for (const user of teamUsers) {
      const cfg = KPI_TARGETS[user.role];
      if (!cfg) continue;

      // Daily metrics - random achievement between 60-100% of target
      for (const target of cfg.daily) {
        // Skip if already exists (idempotent)
        const existing = await db.kpiLog.findUnique({
          where: { userId_metricKey_date: { userId: user.id, metricKey: target.key, date } },
        });
        if (existing) continue;

        const achievementRate = 0.55 + Math.random() * 0.55; // 55%-110%
        const value = Math.round(target.target * achievementRate * 10) / 10;
        await db.kpiLog.create({
          data: { userId: user.id, metricKey: target.key, value, date },
        });
        inserted++;
      }
    }
  }

  // Seed weekly metrics - for current week (one entry per metric)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
  weekStart.setHours(11, 0, 0, 0);

  for (const user of teamUsers) {
    const cfg = KPI_TARGETS[user.role];
    if (!cfg) continue;
    for (const target of cfg.weekly) {
      const existing = await db.kpiLog.findUnique({
        where: { userId_metricKey_date: { userId: user.id, metricKey: target.key, date: weekStart } },
      });
      if (existing) continue;
      const achievementRate = 0.6 + Math.random() * 0.5;
      const value = Math.round(target.target * achievementRate * 10) / 10;
      await db.kpiLog.create({
        data: { userId: user.id, metricKey: target.key, value, date: weekStart },
      });
      inserted++;
    }
  }

  // Seed monthly metrics - for current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  // progress factor based on how far into the month we are
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  for (const user of teamUsers) {
    const cfg = KPI_TARGETS[user.role];
    if (!cfg) continue;
    for (const target of cfg.monthly) {
      const existing = await db.kpiLog.findUnique({
        where: { userId_metricKey_date: { userId: user.id, metricKey: target.key, date: monthStart } },
      });
      if (existing) continue;
      // Monthly actual = target * monthProgress * achievement variance
      const achievementRate = monthProgress * (0.8 + Math.random() * 0.4);
      const value = Math.round(target.target * achievementRate * 10) / 10;
      await db.kpiLog.create({
        data: { userId: user.id, metricKey: target.key, value, date: monthStart },
      });
      inserted++;
    }
  }

  console.log(`KPI seed complete. Inserted ${inserted} KpiLog entries.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
