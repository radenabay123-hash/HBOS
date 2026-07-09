import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET agenda for today
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const agendas = await db.dailyAgenda.findMany({
      where: {
        userId: user.id,
        tanggal: { gte: start, lte: end },
      },
      orderBy: [{ jamMulai: "asc" }],
      include: {
        client: { select: { id: true, namaKlien: true, instansi: true, pic: true, nomorWA: true } },
        event: { select: { id: true, namaEvent: true, lokasi: true, trainer: true, tanggal: true } },
        trainer: { select: { id: true, name: true, role: true, phone: true } },
      },
    });

    return ok({ agendas, date: now.toISOString() });
  });
}
