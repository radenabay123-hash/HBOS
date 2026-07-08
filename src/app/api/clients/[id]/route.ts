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
    const client = await db.client.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        events: true, documents: true, financeTxns: true,
      },
    });
    if (!client) return err("Client tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER && client.assignedToId !== user.id) {
      return err("Forbidden", 403);
    }
    return ok({ client });
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
    const {
      namaKlien, instansi, pic, nomorWA, email, jenisTraining,
      jumlahPeserta, budget, lokasi, tanggalEvent, status,
      catatanFollowUp, reminderFollowUp, assignedToId,
    } = body;

    const data: any = {};
    if (namaKlien != null) data.namaKlien = namaKlien;
    if (instansi != null) data.instansi = instansi;
    if (pic != null) data.pic = pic;
    if (nomorWA != null) data.nomorWA = nomorWA;
    if (email != null) data.email = email;
    if (jenisTraining != null) data.jenisTraining = jenisTraining;
    if (jumlahPeserta != null) data.jumlahPeserta = jumlahPeserta ? Number(jumlahPeserta) : null;
    if (budget != null) data.budget = budget ? Number(budget) : null;
    if (lokasi != null) data.lokasi = lokasi;
    if (tanggalEvent != null) data.tanggalEvent = tanggalEvent ? new Date(tanggalEvent) : null;
    if (status != null) data.status = status;
    if (catatanFollowUp != null) data.catatanFollowUp = catatanFollowUp;
    if (reminderFollowUp != null) data.reminderFollowUp = reminderFollowUp ? new Date(reminderFollowUp) : null;
    if (assignedToId != null) data.assignedToId = assignedToId || null;

    const client = await db.client.update({ where: { id }, data });
    return ok({ client });
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
    await db.client.delete({ where: { id } });
    return ok({ success: true });
  });
}
