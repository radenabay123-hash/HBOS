import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();

    // If location/pic changed, create asset movement record
    const existing = await db.inventory.findUnique({ where: { id } });
    if (!existing) return err("Aset tidak ditemukan", 404);

    if ((body.location && body.location !== existing.location) || (body.pic && body.pic !== existing.pic)) {
      await db.assetMovement.create({
        data: {
          assetId: id,
          fromLocation: existing.location,
          toLocation: body.location || existing.location,
          fromPic: existing.pic,
          toPic: body.pic || existing.pic,
          reason: body.movementReason || "Pemindahan aset",
        },
      });
    }

    const data: any = {};
    if (body.name != null) data.name = body.name;
    if (body.category != null) data.category = body.category;
    if (body.photoUrl != null) data.photoUrl = body.photoUrl;
    if (body.location != null) data.location = body.location;
    if (body.pic != null) data.pic = body.pic;
    if (body.purchasePrice != null) data.purchasePrice = Number(body.purchasePrice);
    if (body.usefulLife != null) data.usefulLife = Number(body.usefulLife);
    if (body.status != null) data.status = body.status;
    if (body.notes != null) data.notes = body.notes;
    if (body.nextMaintenance != null) data.nextMaintenance = body.nextMaintenance ? new Date(body.nextMaintenance) : null;

    // Recalculate depreciation if needed
    if (data.purchasePrice || data.usefulLife) {
      const price = data.purchasePrice || existing.purchasePrice;
      const life = data.usefulLife || existing.usefulLife;
      const now = new Date();
      const yearsElapsed = (now.getTime() - existing.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const annualDep = price / life;
      data.accumulatedDepreciation = Math.round(Math.min(annualDep * yearsElapsed, price));
      data.currentValue = Math.round(Math.max(price - data.accumulatedDepreciation, 0));
    }

    const item = await db.inventory.update({ where: { id }, data });
    return ok({ inventory: item });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { id } = await params;
    await db.inventory.delete({ where: { id } });
    return ok({ success: true });
  });
}
