import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, TEAM_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET kanban cards
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const date = searchParams.get("date"); // YYYY-MM-DD
    const today = searchParams.get("today"); // "true" shortcut

    const where: any = {};
    if (status) where.status = status;

    // If userId filter is provided, filter by assignee
    if (userId && userId !== "all") {
      where.assigneeId = userId;
    }

    // Date / today filter — filter by tanggal (same calendar day)
    let targetDate: Date | null = null;
    if (today === "true") {
      targetDate = new Date();
    } else if (date) {
      // Parse YYYY-MM-DD as local date at midnight
      const [y, m, d] = date.split("-").map(Number);
      if (y && m && d) targetDate = new Date(y, m - 1, d);
    }
    if (targetDate) {
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    }

    // Team members only see their own cards (unless no filter)
    // Owner can see all
    if (user.role !== ROLES.OWNER && !userId) {
      where.assigneeId = user.id;
    }

    const cards = await db.kanbanCard.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, role: true, position: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });

    // For Owner: also get team users list for the filter
    let teamUsers: any[] = [];
    if (user.role === ROLES.OWNER) {
      teamUsers = await db.user.findMany({
        where: { role: { in: TEAM_ROLES }, isActive: true },
        select: { id: true, name: true, role: true, position: true },
        orderBy: { name: "asc" },
      });
    }

    return ok({ cards, teamUsers, currentUser: { id: user.id, role: user.role } });
  });
}

// POST create card
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const {
      title, description, status, priority, category, dueDate, assigneeId,
      // Daily work log fields (merged from Tugas Harian)
      tanggal, persentaseSelesai, hambatan, strategi, evaluasi, jamMulai, jamSelesai,
    } = body;
    if (!title) return err("Judul wajib diisi", 400);

    // Team members assign to themselves; Owner can assign to anyone
    const targetAssignee = user.role === ROLES.OWNER ? (assigneeId || user.id) : user.id;

    const count = await db.kanbanCard.count({ where: { status: status || "TODO" } });

    // Build data payload with daily work log fields
    const data: any = {
      title,
      description: description || null,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      category: category || null,
      assigneeId: targetAssignee,
      dueDate: dueDate ? new Date(dueDate) : null,
      position: count,
      completedAt: status === "DONE" ? new Date() : null,
      completedById: status === "DONE" ? user.id : null,
    };

    // Daily work log fields
    if (tanggal) data.tanggal = new Date(tanggal);
    if (persentaseSelesai != null) {
      const pct = Number(persentaseSelesai);
      if (!Number.isNaN(pct)) data.persentaseSelesai = Math.max(0, Math.min(100, pct));
    }
    if (hambatan != null) data.hambatan = hambatan || null;
    if (strategi != null) data.strategi = strategi || null;
    if (evaluasi != null) data.evaluasi = evaluasi || null;
    if (jamMulai != null) data.jamMulai = jamMulai || null;
    if (jamSelesai != null) data.jamSelesai = jamSelesai || null;

    const card = await db.kanbanCard.create({
      data,
      include: {
        assignee: { select: { id: true, name: true, role: true, position: true } },
        completedBy: { select: { id: true, name: true } },
      },
    });
    return ok({ card });
  });
}
