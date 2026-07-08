import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET salary configs (owner: all; team: own)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (user.role === ROLES.OWNER) {
      const configs = await db.salaryConfig.findMany({
        include: { user: { select: { id: true, name: true, role: true, position: true } } },
        orderBy: { user: { name: "asc" } },
      });
      return ok({ configs });
    } else {
      const config = await db.salaryConfig.findUnique({
        where: { userId: user.id },
        include: { user: { select: { id: true, name: true, role: true, position: true } } },
      });
      return ok({ config });
    }
  });
}

// POST/PUT salary config (owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { userId, baseSalary, mealAllowance, transportAllowance, bonusTarget, penaltyPerAbsent, bpjs, tax } = body;
    if (!userId) return err("userId wajib diisi", 400);

    const config = await db.salaryConfig.upsert({
      where: { userId },
      update: {
        baseSalary: Number(baseSalary) || undefined,
        mealAllowance: Number(mealAllowance) || 0,
        transportAllowance: Number(transportAllowance) || 0,
        bonusTarget: Number(bonusTarget) || 0,
        penaltyPerAbsent: Number(penaltyPerAbsent) || 0,
        bpjs: Number(bpjs) || 0,
        tax: Number(tax) || 0,
      },
      create: {
        userId,
        baseSalary: Number(baseSalary) || 5000000,
        mealAllowance: Number(mealAllowance) || 0,
        transportAllowance: Number(transportAllowance) || 0,
        bonusTarget: Number(bonusTarget) || 0,
        penaltyPerAbsent: Number(penaltyPerAbsent) || 0,
        bpjs: Number(bpjs) || 0,
        tax: Number(tax) || 0,
      },
    });

    return ok({ config });
  });
}
