import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// GET single agenda by id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const agenda = await db.dailyAgenda.findFirst({
      where: { id, userId: user.id },
      include: {
        client: { select: { id: true, namaKlien: true, instansi: true, pic: true, nomorWA: true } },
        event: { select: { id: true, namaEvent: true, lokasi: true, trainer: true, tanggal: true } },
        trainer: { select: { id: true, name: true, role: true, phone: true } },
      },
    });
    if (!agenda) return err("Agenda tidak ditemukan", 404);

    return ok({ agenda });
  });
}

// PUT update agenda
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const existing = await db.dailyAgenda.findFirst({ where: { id, userId: user.id } });
    if (!existing) return err("Agenda tidak ditemukan", 404);

    const body = await req.json();
    const {
      tipe, judul, tanggal, jamMulai, jamSelesai,
      lokasi, linkMeeting, isOnline,
      clientId, picNama, picTelepon, trainerId,
      eventId, catatan, checklist, reminder, status,
    } = body;

    const agenda = await db.dailyAgenda.update({
      where: { id },
      data: {
        ...(tipe && { tipe }),
        ...(judul && { judul }),
        ...(tanggal && { tanggal: new Date(tanggal) }),
        ...(jamMulai && { jamMulai }),
        ...(jamSelesai && { jamSelesai }),
        ...(lokasi !== undefined && { lokasi: lokasi || null }),
        ...(linkMeeting !== undefined && { linkMeeting: linkMeeting || null }),
        ...(isOnline !== undefined && { isOnline }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(picNama !== undefined && { picNama: picNama || null }),
        ...(picTelepon !== undefined && { picTelepon: picTelepon || null }),
        ...(trainerId !== undefined && { trainerId: trainerId || null }),
        ...(eventId !== undefined && { eventId: eventId || null }),
        ...(catatan !== undefined && { catatan: catatan || null }),
        ...(checklist !== undefined && { checklist: checklist ? JSON.stringify(checklist) : null }),
        ...(reminder !== undefined && { reminder: reminder || null }),
        ...(status && { status }),
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

// DELETE agenda
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const existing = await db.dailyAgenda.findFirst({ where: { id, userId: user.id } });
    if (!existing) return err("Agenda tidak ditemukan", 404);

    await db.dailyAgenda.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
