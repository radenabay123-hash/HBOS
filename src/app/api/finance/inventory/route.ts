import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET inventory list
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const items = await db.inventory.findMany({
      orderBy: { purchaseDate: "desc" },
      include: { _count: { select: { movements: true } } },
    });
    return ok({ inventory: items });
  });
}

// POST create inventory (Owner + Finance)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const body = await req.json();
    const { name, category, photoUrl, location, pic, purchaseDate, purchasePrice, usefulLife, notes, nextMaintenance } = body;
    if (!name || !category || !purchaseDate || !purchasePrice) return err("Nama, kategori, tanggal beli, harga wajib diisi", 400);

    const date = new Date(purchaseDate);
    const now = new Date();
    const yearsElapsed = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const annualDep = purchasePrice / (usefulLife || 5);
    const accumDep = Math.min(annualDep * yearsElapsed, purchasePrice);
    const currentValue = Math.max(purchasePrice - accumDep, 0);

    const item = await db.inventory.create({
      data: {
        name, category, photoUrl, location, pic,
        purchaseDate: date, purchasePrice: Number(purchasePrice),
        usefulLife: Number(usefulLife) || 5,
        currentValue: Math.round(currentValue),
        accumulatedDepreciation: Math.round(accumDep),
        notes, nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
      },
    });
    return ok({ inventory: item });
  });
}
