import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, CONTENT_CATEGORIES } from "@/lib/constants";

export const runtime = "nodejs";

// List content ideas
// Owner: all. Team: their own. PM: all (PM manages). Others: their own.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const statusACC = searchParams.get("statusACC");
    const kategori = searchParams.get("kategori");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }
    if (statusACC) where.statusACC = statusACC;
    if (kategori) where.kategori = kategori;

    const ideas = await db.contentIdea.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return ok({ ideas });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const body = await req.json();
    const {
      kategori, judul, link, ideKonten, script, caption,
      statusProduksi, statusEditing, statusPublish, linkKonten, metrikKonten, tanggal,
    } = body;

    if (!kategori || !judul) return err("Kategori dan judul wajib diisi", 400);
    if (!CONTENT_CATEGORIES.includes(kategori)) return err("Kategori tidak valid", 400);

    const idea = await db.contentIdea.create({
      data: {
        userId: user.id, kategori, judul, link, ideKonten, script, caption,
        statusProduksi: statusProduksi || "IDE",
        statusEditing: statusEditing || "PENDING",
        statusPublish: statusPublish || "PENDING",
        linkKonten, metrikKonten: metrikKonten ? JSON.stringify(metrikKonten) : null,
        statusACC: "PENDING",
        tanggal: tanggal ? new Date(tanggal) : new Date(),
      },
    });
    return ok({ idea });
  });
}
