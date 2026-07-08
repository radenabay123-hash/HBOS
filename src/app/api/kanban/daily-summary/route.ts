import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// Helper: generate or update daily work summary for a user on a specific date
// Called automatically when a Kanban card is moved to DONE
export async function upsertDailyWorkSummary(userId: string, date: Date) {
  // Normalize to date-only (midnight local)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Get start and end of this date
  const startOfDay = new Date(dateOnly);
  const endOfDay = new Date(dateOnly);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Fetch all DONE cards completed by this user on this date
  const completedCards = await db.kanbanCard.findMany({
    where: {
      completedById: userId,
      status: "DONE",
      completedAt: { gte: startOfDay, lt: endOfDay },
    },
    orderBy: { completedAt: "asc" },
  });

  if (completedCards.length === 0) {
    // No completed cards - if summary exists, delete it (card was moved away from DONE)
    await db.dailyWorkSummary.deleteMany({
      where: { userId, date: dateOnly },
    });
    return null;
  }

  // Calculate stats
  const highPriorityCount = completedCards.filter((c) => c.priority === "HIGH" || c.priority === "URGENT").length;
  const mediumPriorityCount = completedCards.filter((c) => c.priority === "MEDIUM").length;
  const lowPriorityCount = completedCards.filter((c) => c.priority === "LOW").length;
  const categoriesSet = new Set(completedCards.map((c) => c.category).filter(Boolean));
  const categories = Array.from(categoriesSet).join(", ");

  // Build task details JSON
  const taskDetails = completedCards.map((c) => ({
    title: c.title,
    description: c.description || "",
    category: c.category || "Umum",
    priority: c.priority,
    completedAt: c.completedAt?.toISOString() || "",
  }));

  // Generate narrative summary text
  const userRecord = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const userName = userRecord?.name || "User";
  const dateStr = dateOnly.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const summaryText = `Ringkasan Pekerjaan ${userName}
${dateStr}

Total pekerjaan selesai: ${completedCards.length}
- Prioritas Tinggi/Mendesak: ${highPriorityCount}
- Prioritas Sedang: ${mediumPriorityCount}
- Prioritas Rendah: ${lowPriorityCount}
- Kategori: ${categories || "Umum"}

Daftar Pekerjaan:
${completedCards.map((c, i) => `${i + 1}. ${c.title} [${c.priority}]${c.category ? ` (${c.category})` : ""}`).join("\n")}`;

  // Upsert daily summary
  const summary = await db.dailyWorkSummary.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    update: {
      totalCompleted: completedCards.length,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      categories,
      summaryText,
      taskDetails: JSON.stringify(taskDetails),
      updatedAt: new Date(),
    },
    create: {
      userId,
      date: dateOnly,
      totalCompleted: completedCards.length,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      categories,
      summaryText,
      taskDetails: JSON.stringify(taskDetails),
    },
  });

  return summary;
}

// GET - list daily work summaries (with filters)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};
    // Non-owner can only see their own summaries
    if (user.role !== "OWNER" && user.role !== "PROJECT_MANAGER") {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const ed = new Date(endDate);
        ed.setDate(ed.getDate() + 1);
        where.date.lt = ed;
      }
    }

    const summaries = await db.dailyWorkSummary.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, position: true } },
      },
    });

    return ok({ summaries });
  });
}
