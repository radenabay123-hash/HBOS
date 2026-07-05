import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const body = await req.json();
    const { taskHariIni, progress, persentaseSelesai, hambatan, jamMulai, jamSelesai, status, tanggal } = body;

    const task = await db.dailyTask.findUnique({ where: { id } });
    if (!task) return err("Task tidak ditemukan", 404);
    // Owner can edit all; others only their own
    if (user.role !== ROLES.OWNER && task.userId !== user.id) return err("Forbidden", 403);

    const data: any = {};
    if (taskHariIni != null) data.taskHariIni = taskHariIni;
    if (progress != null) data.progress = progress;
    if (persentaseSelesai != null) data.persentaseSelesai = Number(persentaseSelesai);
    if (hambatan != null) data.hambatan = hambatan;
    if (jamMulai != null) data.jamMulai = jamMulai;
    if (jamSelesai != null) data.jamSelesai = jamSelesai;
    if (status != null) data.status = status;
    if (tanggal != null) data.tanggal = new Date(tanggal);

    const updated = await db.dailyTask.update({ where: { id }, data });
    return ok({ task: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const task = await db.dailyTask.findUnique({ where: { id } });
    if (!task) return err("Task tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && task.userId !== user.id) return err("Forbidden", 403);
    await db.dailyTask.delete({ where: { id } });
    return ok({ success: true });
  });
}
