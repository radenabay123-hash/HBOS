import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

// Owner ACC / Revisi workflow for content ideas
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await params;
    const body = await req.json();
    const { statusACC, catatanRevisi } = body;
    if (!["ACC", "REVISI"].includes(statusACC)) {
      return err("statusACC harus ACC atau REVISI", 400);
    }

    const idea = await db.contentIdea.findUnique({ where: { id } });
    if (!idea) return err("Content idea tidak ditemukan", 404);

    const updated = await db.contentIdea.update({
      where: { id },
      data: {
        statusACC,
        catatanRevisi: statusACC === "REVISI" ? (catatanRevisi || null) : null,
        accAt: new Date(),
        accById: user.id,
        // If ACC, allow publish checkbox to appear on team dashboard
      },
    });

    // Create notification for the team member
    await db.notification.create({
      data: {
        userId: idea.userId,
        title: statusACC === "ACC" ? "Konten Di-ACC Owner" : "Konten Perlu Revisi",
        message:
          statusACC === "ACC"
            ? `Konten "${idea.judul}" telah disetujui (ACC). Anda dapat publish.`
            : `Konten "${idea.judul}" perlu direvisi. Catatan: ${catatanRevisi || "-"}`,
        type: statusACC === "ACC" ? "ACC" : "REVISI",
        link: "/",
      },
    });

    return ok({ idea: updated });
  });
}
