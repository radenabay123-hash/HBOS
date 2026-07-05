import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// PUT update card (move, edit, auto-save on DONE)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const body = await req.json();
    const { title, description, status, priority, category, dueDate, assigneeId, position } = body;

    // Get existing card to check status change
    const existing = await db.kanbanCard.findUnique({ where: { id } });
    if (!existing) return err("Card tidak ditemukan", 404);

    const data: any = {};
    if (title != null) data.title = title;
    if (description != null) data.description = description;
    if (status != null) data.status = status;
    if (priority != null) data.priority = priority;
    if (category != null) data.category = category;
    if (dueDate != null) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId != null) data.assigneeId = assigneeId || null;
    if (position != null) data.position = Number(position);

    // AUTO-SAVE: when card moved to DONE, record completedAt
    if (status === "DONE" && existing.status !== "DONE") {
      data.completedAt = new Date();
      data.completedById = user.id;
    }
    // If moved away from DONE, clear completedAt
    if (status && status !== "DONE" && existing.status === "DONE") {
      data.completedAt = null;
      data.completedById = null;
    }

    const card = await db.kanbanCard.update({ where: { id }, data });
    return ok({ card });
  });
}

// DELETE card
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    await db.kanbanCard.delete({ where: { id } });
    return ok({ success: true });
  });
}
