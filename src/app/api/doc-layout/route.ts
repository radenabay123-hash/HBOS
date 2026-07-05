import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET document layout settings
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("docType");

    if (docType) {
      const layout = await db.documentLayout.findUnique({ where: { docType } });
      return ok({ layout: layout ? JSON.parse(layout.settings) : null });
    }

    const layouts = await db.documentLayout.findMany();
    const result: Record<string, any> = {};
    for (const l of layouts) {
      result[l.docType] = JSON.parse(l.settings);
    }
    return ok({ layouts: result });
  });
}

// PUT update document layout (Owner only)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { docType, settings } = body;
    if (!docType || !settings) return err("docType dan settings wajib diisi", 400);

    const layout = await db.documentLayout.upsert({
      where: { docType },
      update: { settings: JSON.stringify(settings) },
      create: { docType, settings: JSON.stringify(settings) },
    });

    return ok({ layout: JSON.parse(layout.settings) });
  });
}
