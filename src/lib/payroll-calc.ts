// Payroll calculation engine
// Calculates monthly payroll from: base salary + allowances + KPI bonus - attendance deduction - bpjs - tax
import { db } from "./db";
import { computeKpiScore } from "./kpi-score";

export interface PayrollCalc {
  userId: string;
  userName: string;
  role: string;
  month: number;
  year: number;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  workingDays: number;     // total weekdays in month
  presentDays: number;     // HADIR + TERLAMBAT
  absentDays: number;      // ALPHA
  lateDays: number;        // TERLAMBAT
  leaveDays: number;       // IZIN + SAKIT + CUTI
  kpiScore: number;
  kpiBonus: number;        // bonus based on KPI
  attendanceDeduction: number; // penalty for absences
  bpjs: number;
  tax: number;
  otherDeduction: number;
  grossSalary: number;     // base + allowances + kpiBonus
  totalDeduction: number;  // attendanceDeduction + bpjs + tax + other
  netSalary: number;       // gross - totalDeduction
}

// Count weekdays (Mon-Fri) in a month
function countWeekdays(year: number, month: number): number {
  let count = 0;
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export async function calculatePayroll(
  userId: string,
  month: number,
  year: number
): Promise<PayrollCalc | null> {
  // Get salary config
  const config = await db.salaryConfig.findUnique({ where: { userId } });
  if (!config) return null;

  // Get user info
  const userRecord = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!userRecord) return null;

  // Get attendance for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const attendances = await db.attendance.findMany({
    where: { userId, date: { gte: startDate, lt: endDate } },
  });

  const presentDays = attendances.filter((a) => a.status === "HADIR" || a.status === "TERLAMBAT").length;
  const absentDays = attendances.filter((a) => a.status === "ALPHA").length;
  const lateDays = attendances.filter((a) => a.status === "TERLAMBAT").length;
  const leaveDays = attendances.filter((a) => ["IZIN", "SAKIT", "CUTI"].includes(a.status)).length;
  const workingDays = countWeekdays(year, month - 1);

  // Get KPI score for the month (use last day of month as reference)
  const refDate = new Date(year, month, 0);
  const kpiResult = await computeKpiScore(userId, userRecord.role, userRecord.name, refDate).catch(() => null);
  const kpiScore = kpiResult?.weightedScore || 0;

  // KPI Bonus: full bonus if KPI >= 90, proportional if 70-89, 0 if <70
  let kpiBonus = 0;
  if (kpiScore >= 90) {
    kpiBonus = config.bonusTarget;
  } else if (kpiScore >= 80) {
    kpiBonus = Math.round(config.bonusTarget * 0.75);
  } else if (kpiScore >= 70) {
    kpiBonus = Math.round(config.bonusTarget * 0.5);
  }

  // Attendance deduction: penalty per absent day
  const attendanceDeduction = absentDays * config.penaltyPerAbsent;

  // Pro-rate meal & transport allowance based on present days
  const attendanceRate = workingDays > 0 ? presentDays / workingDays : 0;
  const mealAllowance = Math.round(config.mealAllowance * attendanceRate);
  const transportAllowance = Math.round(config.transportAllowance * attendanceRate);

  const grossSalary = config.baseSalary + mealAllowance + transportAllowance + kpiBonus;
  const totalDeduction = attendanceDeduction + config.bpjs + config.tax;
  const netSalary = grossSalary - totalDeduction;

  return {
    userId,
    userName: userRecord.name,
    role: userRecord.role,
    month,
    year,
    baseSalary: config.baseSalary,
    mealAllowance,
    transportAllowance,
    workingDays,
    presentDays,
    absentDays,
    lateDays,
    leaveDays,
    kpiScore,
    kpiBonus,
    attendanceDeduction,
    bpjs: config.bpjs,
    tax: config.tax,
    otherDeduction: 0,
    grossSalary,
    totalDeduction,
    netSalary,
  };
}

export async function calculateAllPayrolls(month: number, year: number): Promise<PayrollCalc[]> {
  const TEAM_ROLES = ["PROJECT_MANAGER", "ASSISTANT_TRAINER", "CONTENT_CREATIVE", "DIGITAL_MARKETING_IT", "FINANCE"];
  const users = await db.user.findMany({
    where: { role: { in: TEAM_ROLES }, isActive: true },
    select: { id: true },
  });
  const results: PayrollCalc[] = [];
  for (const u of users) {
    const calc = await calculatePayroll(u.id, month, year).catch(() => null);
    if (calc) results.push(calc);
  }
  return results;
}
