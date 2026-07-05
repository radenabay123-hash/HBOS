import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET kanban cards
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const cards = await db.kanbanCard.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    });
    return ok({ cards });
  });
}

// POST create card
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { title, description, status, priority, category, dueDate, assigneeId } = body;
    if (!title) return err("Judul wajib diisi", 400);

    // Count cards in target column for position
    const count = await db.kanbanCard.count({ where: { status: status || "TODO" } });

    const card = await db.kanbanCard.create({
      data: {
        title,
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        category: category || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: count,
        // Auto-save: if created as DONE, set completedAt
        completedAt: status === "DONE" ? new Date() : null,
        completedById: status === "DONE" ? user.id : null,
      },
    });
    return ok({ card });
  });
}
