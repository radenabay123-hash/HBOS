import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const body = await req.json();
    const { judulArtikel, keyword, websiteTujuan, tanggalPublish, linkArtikel, status } = body;

    const article = await db.article.findUnique({ where: { id } });
    if (!article) return err("Artikel tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && article.userId !== user.id) return err("Forbidden", 403);

    const data: any = {};
    if (judulArtikel != null) data.judulArtikel = judulArtikel;
    if (keyword != null) data.keyword = keyword;
    if (websiteTujuan != null) data.websiteTujuan = websiteTujuan;
    if (tanggalPublish != null) data.tanggalPublish = tanggalPublish ? new Date(tanggalPublish) : null;
    if (linkArtikel != null) data.linkArtikel = linkArtikel;
    if (status != null) {
      // Team can publish only if ACC'd
      if (status === "PUBLISHED" && article.statusACC !== "ACC" && user.role !== ROLES.OWNER) {
        return err("Artikel belum di-ACC owner, tidak bisa publish", 400);
      }
      data.status = status;
    }

    const updated = await db.article.update({ where: { id }, data });
    return ok({ article: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const article = await db.article.findUnique({ where: { id } });
    if (!article) return err("Artikel tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && article.userId !== user.id) return err("Forbidden", 403);
    await db.article.delete({ where: { id } });
    return ok({ success: true });
  });
}
