import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// DELETE — delete criteria (Owner only)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await ctx.params;
    if (!id) return err("id wajib diisi", 400);

    // Soft delete: set isActive=false. Hard delete would also remove scores (cascade).
    // We hard delete to keep table clean — scores for this criteria will cascade.
    await db.assessmentCriteria.delete({ where: { id } });
    return ok({ success: true });
  });
}
