import { db } from "../src/lib/db";

async function main() {
  console.log("Seeding Attendance & Salary data...");

  const teamUsers = await db.user.findMany({
    where: { role: { in: ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"] }, isActive: true },
    select: { id: true, name: true, role: true },
  });

  // ===== Salary Config =====
  const salaryMap: Record<string, { base: number; meal: number; transport: number; bonus: number; penalty: number; bpjs: number; tax: number }> = {
    PROJECT_MANAGER: { base: 8000000, meal: 500000, transport: 1000000, bonus: 2000000, penalty: 300000, bpjs: 400000, tax: 500000 },
    ASSISTANT_TRAINER: { base: 5500000, meal: 500000, transport: 800000, bonus: 1500000, penalty: 200000, bpjs: 300000, tax: 300000 },
    CONTENT_CREATIVE: { base: 5500000, meal: 500000, transport: 800000, bonus: 1500000, penalty: 200000, bpjs: 300000, tax: 300000 },
    DIGITAL_MARKETING_IT: { base: 6000000, meal: 500000, transport: 800000, bonus: 1500000, penalty: 200000, bpjs: 300000, tax: 350000 },
    FINANCE: { base: 6500000, meal: 500000, transport: 800000, bonus: 1500000, penalty: 200000, bpjs: 350000, tax: 350000 },
  };

  for (const u of teamUsers) {
    const s = salaryMap[u.role];
    await db.salaryConfig.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        baseSalary: s.base,
        mealAllowance: s.meal,
        transportAllowance: s.transport,
        bonusTarget: s.bonus,
        penaltyPerAbsent: s.penalty,
        bpjs: s.bpjs,
        tax: s.tax,
      },
    });
  }
  console.log("Salary configs created for", teamUsers.length, "users");

  // ===== Attendance (last 30 days, weekdays only) =====
  const now = new Date();
  let attendanceCount = 0;
  for (let d = 0; d < 30; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);
    const dayOfWeek = date.getDay();
    // Skip weekends (0=Sunday, 6=Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (const u of teamUsers) {
      // Check if attendance already exists
      const existing = await db.attendance.findUnique({
        where: { userId_date: { userId: u.id, date } },
      });
      if (existing) continue;

      // Random attendance: 85% hadir, 8% terlambat, 3% izin/sakit, 4% alpha
      const rand = Math.random();
      let status = "HADIR";
      let checkIn: Date | null = new Date(date);
      let checkOut: Date | null = new Date(date);
      let workHours: number | null = 8;

      if (rand < 0.85) {
        status = "HADIR";
        checkIn.setHours(8, Math.floor(Math.random() * 30), 0, 0);
        checkOut.setHours(16 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0, 0);
        workHours = 8 + Math.random();
      } else if (rand < 0.93) {
        status = "TERLAMBAT";
        checkIn.setHours(9, 15 + Math.floor(Math.random() * 30), 0, 0);
        checkOut.setHours(16 + Math.floor(Math.random() * 2), 0, 0, 0);
        workHours = 7 + Math.random() * 0.5;
      } else if (rand < 0.96) {
        status = "IZIN";
        checkIn = null;
        checkOut = null;
        workHours = 0;
      } else if (rand < 0.97) {
        status = "SAKIT";
        checkIn = null;
        checkOut = null;
        workHours = 0;
      } else {
        status = "ALPHA";
        checkIn = null;
        checkOut = null;
        workHours = 0;
      }

      await db.attendance.create({
        data: { userId: u.id, date, checkIn, checkOut, status, workHours: workHours ? Math.round(workHours * 10) / 10 : null },
      });
      attendanceCount++;
    }
  }
  console.log("Attendance entries created:", attendanceCount);

  console.log("Seed complete!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
