import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: { client: true, assistantTrainer: { select: { id: true, name: true } } },
    });
    if (!event) return err("Event tidak ditemukan", 404);
    return ok({ event });
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    const body = await req.json();
    const { namaEvent, clientId, tanggal, lokasi, trainer, assistantTrainerId, statusPersiapan, checklist } = body;
    const data: any = {};
    if (namaEvent != null) data.namaEvent = namaEvent;
    if (clientId != null) data.clientId = clientId || null;
    if (tanggal != null) data.tanggal = new Date(tanggal);
    if (lokasi != null) data.lokasi = lokasi;
    if (trainer != null) data.trainer = trainer;
    if (assistantTrainerId != null) data.assistantTrainerId = assistantTrainerId || null;
    if (statusPersiapan != null) data.statusPersiapan = statusPersiapan;
    if (checklist != null) data.checklist = JSON.stringify(checklist);

    const event = await db.event.update({ where: { id }, data });
    return ok({ event });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    await db.event.delete({ where: { id } });
    return ok({ success: true });
  });
}
