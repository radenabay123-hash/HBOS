import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// PUT update status only (UPCOMING, IN_PROGRESS, DONE, CANCELLED)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const existing = await db.dailyAgenda.findFirst({ where: { id, userId: user.id } });
    if (!existing) return err("Agenda tidak ditemukan", 404);

    const body = await req.json();
    const { status } = body;
    if (!["UPCOMING", "IN_PROGRESS", "DONE", "CANCELLED"].includes(status)) {
      return err("Status tidak valid", 400);
    }

    const agenda = await db.dailyAgenda.update({
      where: { id },
      data: { status },
    });

    return ok({ agenda });
  });
}
