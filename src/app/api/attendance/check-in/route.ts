import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// Check-in for today
export async function POST() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if already checked in
    const existing = await db.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    // Work start time: 09:00
    const workStart = new Date(today);
    workStart.setHours(9, 0, 0, 0);
    const isLate = now > workStart;

    if (existing && existing.checkIn) {
      return err("Anda sudah check-in hari ini pada " + new Date(existing.checkIn).toLocaleTimeString("id-ID"), 400);
    }

    const record = await db.attendance.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {
        checkIn: now,
        status: isLate ? "TERLAMBAT" : (existing?.status || "HADIR"),
      },
      create: {
        userId: user.id,
        date: today,
        checkIn: now,
        status: isLate ? "TERLAMBAT" : "HADIR",
      },
    });

    return ok({ attendance: record, checkInTime: now, isLate });
  });
}
