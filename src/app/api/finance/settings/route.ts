import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || new Date().getFullYear());
    const month = Number(searchParams.get("month") || new Date().getMonth() + 1);

    const setting = await db.financeSetting.findUnique({
      where: { month_year: { month, year } },
    });
    return ok({
      setting: setting || { targetRevenue: 500000000, targetProfit: 150000000, month, year },
    });
  });
}

export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const body = await req.json();
    const { targetRevenue, targetProfit, month, year } = body;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();

    const setting = await db.financeSetting.upsert({
      where: { month_year: { month: m, year: y } },
      update: {
        targetRevenue: Number(targetRevenue),
        targetProfit: Number(targetProfit),
      },
      create: {
        month: m, year: y,
        targetRevenue: Number(targetRevenue),
        targetProfit: Number(targetProfit),
      },
    });
    return ok({ setting });
  });
}
