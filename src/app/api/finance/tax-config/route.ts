import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET tax config
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const taxType = searchParams.get("taxType");

    const where: any = { isActive: true };
    if (taxType) where.taxType = taxType;

    const configs = await db.taxConfig.findMany({ where, orderBy: { taxType: "asc" } });
    return ok({ configs });
  });
}

// POST/PUT update tax config (Owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { taxType, name, rate, description, brackets, ptkp } = body;
    if (!taxType || !name) return err("taxType dan name wajib diisi", 400);

    const config = await db.taxConfig.create({
      data: {
        taxType, name, rate: Number(rate) || 0,
        description, brackets, ptkp,
        isActive: true,
      },
    });
    return ok({ config });
  });
}
