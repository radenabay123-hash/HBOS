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
    const {
      kategori, judul, link, ideKonten, script, caption,
      statusProduksi, statusEditing, statusPublish, linkKonten, metrikKonten, tanggal,
    } = body;

    const idea = await db.contentIdea.findUnique({ where: { id } });
    if (!idea) return err("Content idea tidak ditemukan", 404);
    // Owner can edit all; team can edit their own
    if (user.role !== ROLES.OWNER && idea.userId !== user.id) return err("Forbidden", 403);

    const data: any = {};
    if (kategori != null) data.kategori = kategori;
    if (judul != null) data.judul = judul;
    if (link != null) data.link = link;
    if (ideKonten != null) data.ideKonten = ideKonten;
    if (script != null) data.script = script;
    if (caption != null) data.caption = caption;
    if (statusProduksi != null) data.statusProduksi = statusProduksi;
    if (statusEditing != null) data.statusEditing = statusEditing;
    if (statusPublish != null) data.statusPublish = statusPublish;
    if (linkKonten != null) data.linkKonten = linkKonten;
    if (metrikKonten != null) data.metrikKonten = JSON.stringify(metrikKonten);
    if (tanggal != null) data.tanggal = new Date(tanggal);

    const updated = await db.contentIdea.update({ where: { id }, data });
    return ok({ idea: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;
    const idea = await db.contentIdea.findUnique({ where: { id } });
    if (!idea) return err("Content idea tidak ditemukan", 404);
    if (user.role !== ROLES.OWNER && idea.userId !== user.id) return err("Forbidden", 403);
    await db.contentIdea.delete({ where: { id } });
    return ok({ success: true });
  });
}
