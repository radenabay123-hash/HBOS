import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// List tasks. Owner sees all; others see their own.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    const where: any = {};
    if (user.role === ROLES.OWNER) {
      if (userId) where.userId = userId;
    } else {
      where.userId = user.id;
    }
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.tanggal = { gte: d, lt: next };
    }

    const tasks = await db.dailyTask.findMany({
      where,
      orderBy: { tanggal: "desc" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return ok({ tasks });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const body = await req.json();
    const { taskHariIni, progress, persentaseSelesai, hambatan, jamMulai, jamSelesai, status, tanggal } = body;
    if (!taskHariIni) return err("Task hari ini wajib diisi", 400);

    const task = await db.dailyTask.create({
      data: {
        userId: user.id, taskHariIni, progress, persentaseSelesai: Number(persentaseSelesai) || 0,
        hambatan, jamMulai, jamSelesai, status: status || "BELUM",
        tanggal: tanggal ? new Date(tanggal) : new Date(),
      },
    });
    return ok({ task });
  });
}
