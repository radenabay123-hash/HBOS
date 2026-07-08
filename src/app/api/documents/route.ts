import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, DOCUMENT_TYPES } from "@/lib/constants";

export const runtime = "nodejs";

// List documents
// Owner & PM: all. Others: limited (docs are admin; team sees only if uploadedBy them or by role).
// For simplicity: Owner & PM see all. Others see documents linked to events/clients they're assigned to, plus their own uploads.
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const documentType = searchParams.get("documentType");

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (documentType) where.documentType = documentType;

    // Finance can see invoice docs; others limited
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER && user.role !== ROLES.FINANCE) {
      // only their own uploads
      where.uploadedById = user.id;
    }

    const docs = await db.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, namaKlien: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    return ok({ documents: docs });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.PROJECT_MANAGER && user.role !== ROLES.FINANCE) {
      return err("Forbidden", 403);
    }
    const body = await req.json();
    const { clientId, documentType, documentName, documentNumber, link, description } = body;
    if (!documentName || !link || !documentType) return err("Nama dokumen, tipe, dan link wajib diisi", 400);
    if (!DOCUMENT_TYPES.includes(documentType) && documentType !== "LAINNYA") {
      // allow custom types
    }

    const doc = await db.document.create({
      data: {
        clientId: clientId || null, documentType, documentName,
        documentNumber, link, description, uploadedById: user.id,
      },
    });
    return ok({ document: doc });
  });
}
