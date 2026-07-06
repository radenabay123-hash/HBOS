import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { calculateAllPayrolls, calculatePayroll } from "@/lib/payroll-calc";

export const runtime = "nodejs";

// GET payrolls (owner: all; team: own)
// month=0 and/or year=0 means "no filter" (Semua Bulan / Semua Tahun).
// When either is 0, we return ALL saved payrolls matching the other filter
// (no preview calculation, since preview requires a specific month+year).
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    // Treat absent / "0" as "no filter"
    const month = monthParam ? Number(monthParam) : 0;
    const year = yearParam ? Number(yearParam) : 0;

    if (user.role === ROLES.OWNER) {
      // Both specified → existing behavior (saved payrolls OR preview calculation)
      if (month > 0 && year > 0) {
        const saved = await db.payroll.findMany({
          where: { month, year },
          include: { user: { select: { id: true, name: true, role: true, position: true } } },
          orderBy: { user: { name: "asc" } },
        });

        if (saved.length > 0) {
          return ok({ payrolls: saved, month, year, saved: true });
        }

        const calc = await calculateAllPayrolls(month, year);
        return ok({ payrolls: calc, month, year, saved: false });
      }

      // Either month=0 or year=0 → return all saved payrolls matching the non-zero filter
      const where: any = {};
      if (month > 0) where.month = month;
      if (year > 0) where.year = year;
      const saved = await db.payroll.findMany({
        where,
        include: { user: { select: { id: true, name: true, role: true, position: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }, { user: { name: "asc" } }],
      });
      return ok({ payrolls: saved, month, year, saved: true });
    } else {
      // Team: only return a specific payroll when both month and year are specified
      if (month > 0 && year > 0) {
        const payroll = await db.payroll.findUnique({
          where: { userId_month_year: { userId: user.id, month, year } },
          include: { user: { select: { id: true, name: true, role: true, position: true } } },
        });

        if (payroll) {
          return ok({ payroll, month, year, saved: true });
        }

        const calc = await calculatePayroll(user.id, month, year).catch(() => null);
        return ok({ payroll: calc, month, year, saved: false });
      }

      // month=0 or year=0 → no specific period; return null (UI shows "select period" empty state)
      return ok({ payroll: null, month, year, saved: false });
    }
  });
}
