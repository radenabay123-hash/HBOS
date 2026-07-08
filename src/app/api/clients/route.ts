import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, CLIENT_STATUS } from "@/lib/constants";

export const runtime = "nodejs";

// List clients
// Owner sees all. PM sees assigned + all (PM manages CRM). Others see only assigned.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const assignedToId = searchParams.get("assignedToId");

    const where: any = {};
    if (status && CLIENT_STATUS.includes(status as any)) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    // Non-owner, non-PM: only see assigned to them
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      where.assignedToId = user.id;
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        _count: { select: { events: true, documents: true, financeTxns: true } },
      },
    });
    return ok({ clients });
  });
}

// Create client (Owner or PM)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const {
      namaKlien, instansi, pic, nomorWA, email, jenisTraining,
      jumlahPeserta, budget, lokasi, tanggalEvent, status,
      catatanFollowUp, reminderFollowUp, assignedToId,
    } = body;

    if (!namaKlien) return err("Nama klien wajib diisi", 400);

    const client = await db.client.create({
      data: {
        namaKlien, instansi, pic, nomorWA, email, jenisTraining,
        jumlahPeserta: jumlahPeserta ? Number(jumlahPeserta) : null,
        budget: budget ? Number(budget) : null,
        lokasi, tanggalEvent: tanggalEvent ? new Date(tanggalEvent) : null,
        status: status || "LEAD",
        catatanFollowUp, reminderFollowUp: reminderFollowUp ? new Date(reminderFollowUp) : null,
        assignedToId: assignedToId || user.id,
      },
    });
    return ok({ client });
  });
}
