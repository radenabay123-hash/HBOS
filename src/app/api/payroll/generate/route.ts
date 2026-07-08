import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { calculateAllPayrolls } from "@/lib/payroll-calc";

export const runtime = "nodejs";

// Generate/save payrolls for a month (owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { month, year } = body;
    if (!month || !year) return err("month dan year wajib diisi", 400);

    const calcs = await calculateAllPayrolls(Number(month), Number(year));

    // Upsert each payroll
    const results = [];
    for (const c of calcs) {
      const payroll = await db.payroll.upsert({
        where: { userId_month_year: { userId: c.userId, month: c.month, year: c.year } },
        update: {
          baseSalary: c.baseSalary,
          mealAllowance: c.mealAllowance,
          transportAllowance: c.transportAllowance,
          workingDays: c.workingDays,
          presentDays: c.presentDays,
          absentDays: c.absentDays,
          lateDays: c.lateDays,
          leaveDays: c.leaveDays,
          kpiScore: c.kpiScore,
          kpiBonus: c.kpiBonus,
          attendanceDeduction: c.attendanceDeduction,
          bpjs: c.bpjs,
          tax: c.tax,
          otherDeduction: c.otherDeduction,
          grossSalary: c.grossSalary,
          totalDeduction: c.totalDeduction,
          netSalary: c.netSalary,
        },
        create: {
          userId: c.userId,
          month: c.month,
          year: c.year,
          baseSalary: c.baseSalary,
          mealAllowance: c.mealAllowance,
          transportAllowance: c.transportAllowance,
          workingDays: c.workingDays,
          presentDays: c.presentDays,
          absentDays: c.absentDays,
          lateDays: c.lateDays,
          leaveDays: c.leaveDays,
          kpiScore: c.kpiScore,
          kpiBonus: c.kpiBonus,
          attendanceDeduction: c.attendanceDeduction,
          bpjs: c.bpjs,
          tax: c.tax,
          otherDeduction: c.otherDeduction,
          grossSalary: c.grossSalary,
          totalDeduction: c.totalDeduction,
          netSalary: c.netSalary,
          status: "DRAFT",
        },
      });
      results.push(payroll);
    }

    return ok({ payrolls: results, count: results.length });
  });
}
