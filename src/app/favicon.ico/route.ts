import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
// Cache favicon for 1 hour on the client and at the CDN edge.
export const revalidate = 3600;

// Dynamically serve the app_logo (fallback: company_logo) as the favicon.
// Falls back to a 404 if neither is set — the browser will then ignore it
// and use the static icon declared in `metadata.icons`.
export async function GET() {
  try {
    // Prefer app_logo, then legacy company_logo
    const keys = ["app_logo", "company_logo"];
    const settings = await db.appSetting.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    const logoUrl = map.app_logo || map.company_logo || "";

    if (logoUrl) {
      const filePath = path.join(process.cwd(), "public", logoUrl);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
          ext === ".png" ? "image/png" :
          ext === ".svg" ? "image/svg+xml" :
          ext === ".webp" ? "image/webp" :
          "image/png";
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }
    }
  } catch {
    // ignore — fall through to 404
  }

  return new Response(null, { status: 404 });
}
