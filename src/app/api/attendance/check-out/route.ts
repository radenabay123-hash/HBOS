import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// Check-out for today
export async function POST() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await db.attendance.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });

    if (!existing || !existing.checkIn) {
      return err("Anda belum check-in hari ini", 400);
    }
    if (existing.checkOut) {
      return err("Anda sudah check-out hari ini pada " + new Date(existing.checkOut).toLocaleTimeString("id-ID"), 400);
    }

    // Calculate work hours
    const diff = (now.getTime() - existing.checkIn.getTime()) / (1000 * 60 * 60);
    const workHours = Math.round(diff * 10) / 10;

    const record = await db.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now, workHours },
    });

    return ok({ attendance: record, checkOutTime: now, workHours });
  });
}
