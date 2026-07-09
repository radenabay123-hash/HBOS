import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET list of agendas for current user with optional filters
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const tanggal = searchParams.get("tanggal"); // specific date (YYYY-MM-DD)
    const bulan = searchParams.get("bulan"); // month 1-12
    const tahun = searchParams.get("tahun"); // year
    const tipe = searchParams.get("tipe"); // BRIEFING, MEETING, EVENT, KUNJUNGAN, LAINNYA
    const status = searchParams.get("status"); // UPCOMING, IN_PROGRESS, DONE, CANCELLED

    const where: any = { userId: user.id };
    if (tipe) where.tipe = tipe;
    if (status) where.status = status;

    if (tanggal) {
      // Specific date filter
      const d = new Date(tanggal);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    } else if (bulan && tahun) {
      // Month + year filter
      const b = Number(bulan);
      const t = Number(tahun);
      const start = new Date(t, b - 1, 1, 0, 0, 0, 0);
      const end = new Date(t, b, 0, 23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    }

    const agendas = await db.dailyAgenda.findMany({
      where,
      orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
      include: {
        client: { select: { id: true, namaKlien: true, instansi: true, pic: true, nomorWA: true } },
        event: { select: { id: true, namaEvent: true, lokasi: true, trainer: true, tanggal: true } },
        trainer: { select: { id: true, name: true, role: true, phone: true } },
      },
    });

    return ok({ agendas });
  });
}

// POST create new agenda
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const {
      tipe, judul, tanggal, jamMulai, jamSelesai,
      lokasi, linkMeeting, isOnline,
      clientId, picNama, picTelepon, trainerId,
      eventId, catatan, checklist, reminder,
    } = body;

    if (!tipe || !judul || !tanggal || !jamMulai || !jamSelesai) {
      return err("Tipe, judul, tanggal, jam mulai, dan jam selesai wajib diisi", 400);
    }
    if (!["BRIEFING", "MEETING", "EVENT", "KUNJUNGAN", "LAINNYA"].includes(tipe)) {
      return err("Tipe agenda tidak valid", 400);
    }

    const agenda = await db.dailyAgenda.create({
      data: {
        userId: user.id,
        tipe,
        judul,
        tanggal: new Date(tanggal),
        jamMulai,
        jamSelesai,
        lokasi: lokasi || null,
        linkMeeting: linkMeeting || null,
        isOnline: isOnline || false,
        clientId: clientId || null,
        picNama: picNama || null,
        picTelepon: picTelepon || null,
        trainerId: trainerId || null,
        eventId: eventId || null,
        catatan: catatan || null,
        checklist: checklist ? JSON.stringify(checklist) : null,
        reminder: reminder || null,
      },
      include: {
        client: { select: { id: true, namaKlien: true, instansi: true, pic: true, nomorWA: true } },
        event: { select: { id: true, namaEvent: true, lokasi: true, trainer: true, tanggal: true } },
        trainer: { select: { id: true, name: true, role: true, phone: true } },
      },
    });

    return ok({ agenda });
  });
}
