import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

// Owner ACC / Revisi Admin workflow for articles
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await params;
    const body = await req.json();
    const { statusACC, catatanRevisi } = body;
    if (!["ACC", "REVISI_ADMIN"].includes(statusACC)) {
      return err("statusACC harus ACC atau REVISI_ADMIN", 400);
    }

    const article = await db.article.findUnique({ where: { id } });
    if (!article) return err("Artikel tidak ditemukan", 404);

    const updated = await db.article.update({
      where: { id },
      data: {
        statusACC,
        catatanRevisi: statusACC === "REVISI_ADMIN" ? (catatanRevisi || null) : null,
        accAt: new Date(),
        accById: user.id,
      },
    });

    await db.notification.create({
      data: {
        userId: article.userId,
        title: statusACC === "ACC" ? "Artikel Di-ACC Owner" : "Artikel Perlu Revisi",
        message:
          statusACC === "ACC"
            ? `Artikel "${article.judulArtikel}" telah disetujui. Anda dapat publish.`
            : `Artikel "${article.judulArtikel}" perlu direvisi. Catatan: ${catatanRevisi || "-"}`,
        type: statusACC === "ACC" ? "ACC" : "REVISI",
        link: "/",
      },
    });

    return ok({ article: updated });
  });
}
