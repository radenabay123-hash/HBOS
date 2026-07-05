import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET categories (all roles can view)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // PEMASUKAN, PENGELUARAN

    const where: any = {};
    if (type) where.type = type;

    const categories = await db.financeCategory.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    return ok({ categories });
  });
}

// POST create category (Owner + Finance)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const body = await req.json();
    const { name, type, icon, color } = body;
    if (!name || !type) return err("Nama dan tipe wajib diisi", 400);
    if (!["PEMASUKAN", "PENGELUARAN"].includes(type)) return err("Tipe tidak valid", 400);

    const cat = await db.financeCategory.create({
      data: { name, type, icon: icon || "Tag", color: color || "slate" },
    });
    return ok({ category: cat });
  });
}
