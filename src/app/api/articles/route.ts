import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Owner: all. PM: all. Others: their own.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const statusACC = searchParams.get("statusACC");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      where.userId = user.id;
    } else if (userId) {
      where.userId = userId;
    }
    if (statusACC) where.statusACC = statusACC;
    if (status) where.status = status;

    const articles = await db.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    return ok({ articles });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const body = await req.json();
    const { judulArtikel, keyword, websiteTujuan, tanggalPublish, linkArtikel, status } = body;
    if (!judulArtikel) return err("Judul artikel wajib diisi", 400);

    const article = await db.article.create({
      data: {
        userId: user.id, judulArtikel, keyword, websiteTujuan,
        tanggalPublish: tanggalPublish ? new Date(tanggalPublish) : null,
        linkArtikel, status: status || "DRAFT", statusACC: "PENDING",
      },
    });
    return ok({ article });
  });
}
