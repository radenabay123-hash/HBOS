import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// GET document layout settings (auto-include logo & signature from app settings)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("docType");

    // Fetch app settings (logo, signature, director info)
    const appSettings = await db.appSetting.findMany({
      where: { key: { in: ["company_logo", "company_signature", "director_name", "director_title", "company_name", "company_address", "company_phone", "company_email", "company_website"] } },
    });
    const appMap: Record<string, string> = {};
    for (const s of appSettings) appMap[s.key] = s.value;

    if (docType) {
      const layout = await db.documentLayout.findUnique({ where: { docType } });
      const settings = layout ? JSON.parse(layout.settings) : {};
      return ok({
        layout: settings,
        appSettings: {
          companyLogo: appMap.company_logo || "",
          companySignature: appMap.company_signature || "",
          directorName: appMap.director_name || "M. Aqil Baihaqi",
          directorTitle: appMap.director_title || "Direktur Utama",
          companyName: appMap.company_name || "PT. HAFARA AQIBA NUSANTARA",
          companyAddress: appMap.company_address || "",
          companyPhone: appMap.company_phone || "",
          companyEmail: appMap.company_email || "",
          companyWebsite: appMap.company_website || "",
        },
      });
    }

    const layouts = await db.documentLayout.findMany();
    const result: Record<string, any> = {};
    for (const l of layouts) {
      result[l.docType] = JSON.parse(l.settings);
    }
    return ok({
      layouts: result,
      appSettings: {
        companyLogo: appMap.company_logo || "",
        companySignature: appMap.company_signature || "",
        directorName: appMap.director_name || "M. Aqil Baihaqi",
        directorTitle: appMap.director_title || "Direktur Utama",
        companyName: appMap.company_name || "PT. HAFARA AQIBA NUSANTARA",
        companyAddress: appMap.company_address || "",
        companyPhone: appMap.company_phone || "",
        companyEmail: appMap.company_email || "",
        companyWebsite: appMap.company_website || "",
      },
    });
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

// POST upload logo or signature image (Owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { key, base64Data, fileName } = body;
    if (!key || !base64Data) return err("key dan base64Data wajib diisi", 400);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return err("Format base64 tidak valid", 400);

    const ext = matches[1].split("/")[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `${key}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;

    // Save to app setting (so it's shared across all documents)
    await db.appSetting.upsert({
      where: { key },
      update: { value: url },
      create: { key, value: url, category: "COMPANY", type: "IMAGE", description: fileName || key },
    });

    return ok({ url });
  });
}
