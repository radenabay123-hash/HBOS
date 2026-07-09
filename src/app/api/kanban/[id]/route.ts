import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { upsertDailyWorkSummary } from "../daily-summary/route";

export const runtime = "nodejs";

// PUT update card (move, edit, auto-save on DONE)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const body = await req.json();
    const {
      title, description, status, priority, category, dueDate, assigneeId, position,
      // Daily work log fields (merged from Tugas Harian)
      tanggal, persentaseSelesai, hambatan, strategi, evaluasi, jamMulai, jamSelesai,
    } = body;

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

    // Daily work log fields
    if (tanggal != null) data.tanggal = tanggal ? new Date(tanggal) : null;
    if (persentaseSelesai != null) {
      const pct = Number(persentaseSelesai);
      if (!Number.isNaN(pct)) data.persentaseSelesai = Math.max(0, Math.min(100, pct));
    }
    if (hambatan != null) data.hambatan = hambatan || null;
    if (strategi != null) data.strategi = strategi || null;
    if (evaluasi != null) data.evaluasi = evaluasi || null;
    if (jamMulai != null) data.jamMulai = jamMulai || null;
    if (jamSelesai != null) data.jamSelesai = jamSelesai || null;

    const now = new Date();
    const wasCompleted = existing.status === "DONE";
    const isCompleting = status === "DONE" && !wasCompleted;
    const isUncompleting = status && status !== "DONE" && wasCompleted;

    // AUTO-SAVE: when card moved to DONE, record completedAt
    if (isCompleting) {
      data.completedAt = now;
      data.completedById = user.id;
    }
    // If moved away from DONE, clear completedAt
    if (isUncompleting) {
      data.completedAt = null;
      data.completedById = null;
    }

    const card = await db.kanbanCard.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, role: true, position: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    // AUTO-GENERATE DAILY WORK SUMMARY when card moved to/from DONE
    // Summary is keyed by (userId, date) so it aggregates all completed work for that day
    try {
      // The user who completed the work is the one whose summary gets updated
      // If completing now: use current user; if uncompleting: use the previous completer
      const summaryUserId = isCompleting ? user.id : (isUncompleting ? (existing.completedById || user.id) : user.id);
      if (summaryUserId) {
        await upsertDailyWorkSummary(summaryUserId, now);
      }
      // If completing for an assignee (different from completer), also update assignee's summary
      // Actually summary is per "completer" - the person who did the work
    } catch (e: any) {
      console.error("Failed to upsert daily summary:", e.message);
    }

    return ok({ card, summaryGenerated: isCompleting || isUncompleting });
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
