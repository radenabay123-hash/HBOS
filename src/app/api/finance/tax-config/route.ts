import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Default tax configs (UU HPP 2022 / UU HPP 2025)
const DEFAULT_CONFIGS = [
  {
    taxType: "PPH21",
    name: "PPh 21 - Penghasilan Karyawan",
    rate: 0, // PPh 21 uses progressive brackets, not flat rate
    description: "Pajak penghasilan karyawan dengan tarif progresif (UU HPP). Dipotong dari gaji bulanan karyawan.",
    brackets: JSON.stringify([
      { min: 0, max: 60000000, rate: 5 },
      { min: 60000000, max: 250000000, rate: 15 },
      { min: 250000000, max: 500000000, rate: 25 },
      { min: 500000000, max: 5000000000, rate: 30 },
      { min: 5000000000, max: null, rate: 35 },
    ]),
    ptkp: JSON.stringify({
      TK0: 54000000, TK1: 58500000, TK2: 63000000, TK3: 67500000,
      K0: 58500000, K1: 63000000, K2: 67500000, K3: 72000000,
    }),
  },
  {
    taxType: "PPH23",
    name: "PPh 23 - Pajak atas Jasa",
    rate: 2,
    description: "PPh 23 atas jasa profesional/consulting (2% dari bruto). Dipotong oleh pemberi kerja.",
    brackets: "",
    ptkp: "",
  },
  {
    taxType: "PPH_BADAN",
    name: "PPh Badan",
    rate: 22,
    description: "Pajak penghasilan badan usaha (UU HPP 2022). Dihitung dari laba perusahaan sebelum pajak.",
    brackets: "",
    ptkp: "",
  },
  {
    taxType: "PPN",
    name: "PPN - Pajak Pertambahan Nilai",
    rate: 11,
    description: "PPN 11% (UU HPP 2022). Ditambahkan ke harga jual barang/jasa kena pajak.",
    brackets: "",
    ptkp: "",
  },
];

// GET tax config - returns all 4 configs (including inactive PPN for toggle display)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const taxType = searchParams.get("taxType");

    if (taxType) {
      // Return single config for a specific taxType (only if active)
      let config = await db.taxConfig.findFirst({
        where: { taxType, isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      if (!config) {
        const def = DEFAULT_CONFIGS.find((d) => d.taxType === taxType);
        if (def) {
          config = await db.taxConfig.create({ data: { ...def, isActive: true } });
        }
      }
      return ok({ config });
    }

    // Return all 4 configs (including inactive ones — for Tax Settings UI to show toggle)
    const result: any[] = [];
    for (const def of DEFAULT_CONFIGS) {
      let config = await db.taxConfig.findFirst({
        where: { taxType: def.taxType },
        orderBy: { updatedAt: "desc" },
      });
      if (!config) {
        config = await db.taxConfig.create({ data: { ...def, isActive: true } });
      }
      result.push(config);
    }
    return ok({ configs: result });
  });
}

// PUT upsert tax config (Owner only) - 1 config per taxType, no duplicates
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { taxType, name, rate, description, brackets, ptkp, isActive } = body;
    if (!taxType) return err("taxType wajib diisi", 400);

    // Find existing config for this taxType (regardless of isActive, to allow reactivation)
    const existing = await db.taxConfig.findFirst({
      where: { taxType },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      taxType,
      name: name || existing?.name || taxType,
      rate: Number(rate) || 0,
      description: description ?? existing?.description ?? "",
      brackets: brackets ?? existing?.brackets ?? "",
      ptkp: ptkp ?? existing?.ptkp ?? "",
      isActive: isActive !== undefined ? isActive : true,
    };

    let config;
    if (existing) {
      // Update existing
      config = await db.taxConfig.update({ where: { id: existing.id }, data });
      // Deactivate any other duplicates of this taxType
      await db.taxConfig.updateMany({
        where: { taxType, id: { not: existing.id }, isActive: true },
        data: { isActive: false },
      });
    } else {
      // Create new
      config = await db.taxConfig.create({ data });
    }

    return ok({ config });
  });
}

// POST = alias for PUT (for backward compatibility)
export async function POST(req: Request) {
  return PUT(req);
}
