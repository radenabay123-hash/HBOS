import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Delete a KPI log (owner or own)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const log = await db.kpiLog.findUnique({ where: { id } });
    if (!log) return err("Log tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && log.userId !== user.id) return err("Forbidden", 403);
    await db.kpiLog.delete({ where: { id } });
    return ok({ success: true });
  });
}
