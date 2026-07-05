import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER && user.role !== ROLES.FINANCE) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    const body = await req.json();
    const { clientId, documentType, documentName, documentNumber, link, description } = body;
    const data: any = {};
    if (clientId != null) data.clientId = clientId || null;
    if (documentType != null) data.documentType = documentType;
    if (documentName != null) data.documentName = documentName;
    if (documentNumber != null) data.documentNumber = documentNumber;
    if (link != null) data.link = link;
    if (description != null) data.description = description;
    const doc = await db.document.update({ where: { id }, data });
    return ok({ document: doc });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    await db.document.delete({ where: { id } });
    return ok({ success: true });
  });
}
