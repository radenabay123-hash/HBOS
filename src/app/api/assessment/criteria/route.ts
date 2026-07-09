import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET — list all active criteria ordered by `order`
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const criteria = await db.assessmentCriteria.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return ok({ criteria });
  });
}

// POST — create criteria (Owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { name, description, weight, dataSource, order, isActive } = body;
    if (!name) return err("Nama kriteria wajib diisi", 400);

    const validSources = ["MANUAL", "ATTENDANCE", "KPI", "SOCIAL_MEDIA", "VIRAL"];
    const ds = String(dataSource || "MANUAL").toUpperCase();
    if (!validSources.includes(ds)) return err("dataSource tidak valid", 400);

    // Determine next order if not provided
    let nextOrder = Number(order);
    if (isNaN(nextOrder)) {
      const existing = await db.assessmentCriteria.findMany({
        where: { isActive: true },
        orderBy: { order: "desc" },
        take: 1,
      });
      nextOrder = (existing[0]?.order || 0) + 1;
    }

    const item = await db.assessmentCriteria.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description) : null,
        weight: Math.min(100, Math.max(0, Number(weight) || 0)),
        dataSource: ds,
        order: nextOrder,
        isActive: isActive !== false,
      },
    });
    return ok({ criteria: item });
  });
}

// PUT — update criteria (Owner only)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { id, name, description, weight, dataSource, order, isActive } = body;
    if (!id) return err("id wajib diisi", 400);

    const data: any = {};
    if (name != null) data.name = String(name).trim();
    if (description != null) data.description = description ? String(description) : null;
    if (weight != null) data.weight = Math.min(100, Math.max(0, Number(weight) || 0));
    if (dataSource != null) {
      const validSources = ["MANUAL", "ATTENDANCE", "KPI", "SOCIAL_MEDIA", "VIRAL"];
      const ds = String(dataSource).toUpperCase();
      if (!validSources.includes(ds)) return err("dataSource tidak valid", 400);
      data.dataSource = ds;
    }
    if (order != null) data.order = Number(order);
    if (isActive != null) data.isActive = Boolean(isActive);

    const item = await db.assessmentCriteria.update({ where: { id }, data });
    return ok({ criteria: item });
  });
}
