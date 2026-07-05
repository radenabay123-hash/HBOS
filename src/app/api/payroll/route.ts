import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { calculateAllPayrolls, calculatePayroll } from "@/lib/payroll-calc";

export const runtime = "nodejs";

// GET payrolls (owner: all; team: own)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const month = Number(searchParams.get("month") || new Date().getMonth() + 1);
    const year = Number(searchParams.get("year") || new Date().getFullYear());

    if (user.role === ROLES.OWNER) {
      // Return saved payrolls, or calculate preview if not saved
      const saved = await db.payroll.findMany({
        where: { month, year },
        include: { user: { select: { id: true, name: true, role: true, position: true } } },
        orderBy: { user: { name: "asc" } },
      });

      // If payrolls exist for this month, return them
      if (saved.length > 0) {
        return ok({ payrolls: saved, month, year, saved: true });
      }

      // Otherwise, calculate preview (not saved)
      const calc = await calculateAllPayrolls(month, year);
      return ok({ payrolls: calc, month, year, saved: false });
    } else {
      // Team: get own payroll
      const payroll = await db.payroll.findUnique({
        where: { userId_month_year: { userId: user.id, month, year } },
        include: { user: { select: { id: true, name: true, role: true, position: true } } },
      });

      if (payroll) {
        return ok({ payroll, month, year, saved: true });
      }

      // Calculate preview
      const calc = await calculatePayroll(user.id, month, year).catch(() => null);
      return ok({ payroll: calc, month, year, saved: false });
    }
  });
}
