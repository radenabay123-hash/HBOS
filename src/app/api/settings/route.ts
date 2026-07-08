import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// GET all settings
// Owner: all settings. Non-owner: public settings only (app_name, logo, company info for display).
// Unauthenticated: public settings only (for login screen).
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();

    // Public settings keys that anyone can see (for app header, login screen, etc.)
    const PUBLIC_KEYS = [
      "app_name", "app_full_name", "company_name", "company_logo",
      "company_address", "company_phone", "company_email", "company_website",
      "primary_color", "theme",
    ];

    let settings;
    if (user?.role === ROLES.OWNER) {
      // Owner sees all settings
      settings = await db.appSetting.findMany({
        orderBy: [{ category: "asc" }, { key: "asc" }],
      });
    } else {
      // Non-owner or unauthenticated: only public keys
      settings = await db.appSetting.findMany({
        where: { key: { in: PUBLIC_KEYS } },
        orderBy: [{ category: "asc" }, { key: "asc" }],
      });
    }

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const s of settings) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }

    return ok({ settings, grouped });
  });
}

// PUT update setting (Owner only)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { key, value } = body;
    if (!key) return err("key wajib diisi", 400);

    const setting = await db.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), category: body.category || "GENERAL", type: body.type || "TEXT", description: body.description },
    });

    return ok({ setting });
  });
}

// POST upload image (logo/signature) - saves to public/uploads
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { key, base64Data, fileName } = body;
    if (!key || !base64Data) return err("key dan base64Data wajib diisi", 400);

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse base64
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return err("Format base64 tidak valid", 400);

    const ext = matches[1].split("/")[1]; // png, jpeg, etc
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `${key}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);

    const url = `/uploads/${filename}`;

    // Save to setting
    const setting = await db.appSetting.upsert({
      where: { key },
      update: { value: url },
      create: { key, value: url, category: "COMPANY", type: "IMAGE", description: fileName || key },
    });

    return ok({ setting, url });
  });
}
