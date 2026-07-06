import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET — list responsibilities, optionally filtered by role
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const where: any = {};
    if (role) where.role = role;

    const items = await db.roleResponsibility.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    // Group by role
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      if (!grouped[item.role]) grouped[item.role] = [];
      grouped[item.role].push(item);
    }

    return ok({ items, grouped });
  });
}

// POST — create new responsibility (Owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { role, title } = body;
    if (!role || !title) return err("Role dan title wajib diisi", 400);

    // Get max order for this role
    const existing = await db.roleResponsibility.findMany({ where: { role }, orderBy: { order: "desc" }, take: 1 });
    const nextOrder = (existing[0]?.order || 0) + 1;

    const item = await db.roleResponsibility.create({
      data: { role, title: String(title).trim(), order: nextOrder },
    });
    return ok({ item });
  });
}

// PUT — update responsibility (Owner only)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { id, title, order } = body;
    if (!id) return err("id wajib diisi", 400);

    const data: any = {};
    if (title != null) data.title = String(title).trim();
    if (order != null) data.order = Number(order);

    const item = await db.roleResponsibility.update({ where: { id }, data });
    return ok({ item });
  });
}

// DELETE — delete responsibility (Owner only)
export async function DELETE(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return err("id wajib diisi", 400);

    await db.roleResponsibility.delete({ where: { id } });
    return ok({ success: true });
  });
}
