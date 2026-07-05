import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET attendance records
// Owner: all (optional userId filter). Team: own only.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

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
      where.date = { gte: d, lt: next };
    } else if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month);
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      include: { user: { select: { id: true, name: true, role: true, position: true } } },
    });
    return ok({ attendance: records });
  });
}

// POST: create manual attendance entry (owner only - for IZIN/SAKIT/CUTI/ALPHA)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { userId, date, status, checkIn, checkOut, note } = body;

    const targetUserId = (user.role === ROLES.OWNER && userId) ? userId : user.id;

    if (!date) return err("Tanggal wajib diisi", 400);

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const data: any = {
      userId: targetUserId,
      date: attendanceDate,
      status: status || "HADIR",
      note: note || null,
    };

    if (checkIn) data.checkIn = new Date(checkIn);
    if (checkOut) data.checkOut = new Date(checkOut);

    // Calculate work hours
    if (data.checkIn && data.checkOut) {
      const diff = (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60);
      data.workHours = Math.round(diff * 10) / 10;
    }

    const record = await db.attendance.upsert({
      where: { userId_date: { userId: targetUserId, date: attendanceDate } },
      update: data,
      create: data,
    });

    return ok({ attendance: record });
  });
}
