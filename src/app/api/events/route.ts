import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const where: any = {};
    if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month);
        where.tanggal = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.tanggal = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    const events = await db.event.findMany({
      where,
      orderBy: { tanggal: "asc" },
      include: {
        client: { select: { id: true, namaKlien: true, instansi: true } },
        assistantTrainer: { select: { id: true, name: true } },
      },
    });
    return ok({ events });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      return err("Forbidden", 403);
    }
    const body = await req.json();
    const { namaEvent, clientId, tanggal, lokasi, trainer, assistantTrainerId, statusPersiapan, checklist } = body;
    if (!namaEvent || !tanggal) return err("Nama event dan tanggal wajib diisi", 400);

    const event = await db.event.create({
      data: {
        namaEvent, clientId: clientId || null,
        tanggal: new Date(tanggal), lokasi, trainer,
        assistantTrainerId: assistantTrainerId || null,
        statusPersiapan: statusPersiapan || "PENDING",
        checklist: checklist ? JSON.stringify(checklist) : null,
      },
    });
    return ok({ event });
  });
}
