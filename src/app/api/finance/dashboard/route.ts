import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { getFinanceDashboard } from "@/lib/finance-engine";

export const runtime = "nodejs";

// GET finance dashboard data (Owner + Finance)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    // year=0 or absent means current year; month=0 or absent means all months
    const year = yearParam != null ? Number(yearParam) : now.getFullYear();
    const month = monthParam != null ? Number(monthParam) : 0;

    const data = await getFinanceDashboard(year, month);
    return ok({ ...data, year, month });
  });
}
