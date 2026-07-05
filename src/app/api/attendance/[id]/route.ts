import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Update attendance (owner only - for editing status/notes)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await params;
    const body = await req.json();
    const { status, checkIn, checkOut, note } = body;

    const data: any = {};
    if (status != null) data.status = status;
    if (checkIn != null) data.checkIn = checkIn ? new Date(checkIn) : null;
    if (checkOut != null) data.checkOut = checkOut ? new Date(checkOut) : null;
    if (note != null) data.note = note;

    if (data.checkIn && data.checkOut) {
      const diff = (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60);
      data.workHours = Math.round(diff * 10) / 10;
    }

    const record = await db.attendance.update({ where: { id }, data });
    return ok({ attendance: record });
  });
}

// Delete attendance (owner only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await params;
    await db.attendance.delete({ where: { id } });
    return ok({ success: true });
  });
}
