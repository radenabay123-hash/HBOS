import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET own profile
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    let profile = await db.employeeProfile.findUnique({
      where: { userId: user.id },
    });

    // Auto-create empty profile if not exists
    if (!profile) {
      profile = await db.employeeProfile.create({
        data: { userId: user.id },
      });
    }

    return ok({ profile, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, position: user.position } });
  });
}

// PUT update own profile (team fills their own data)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    
    // Fields that team members can edit
    const allowedFields = [
      "nik", "tempatLahir", "tanggalLahir", "jenisKelamin", "golonganDarah",
      "agama", "statusPernikahan", "kewarganegaraan",
      "alamatKtp", "alamatDomisili", "provinsi", "kota", "kodePos",
      "kontakDaruratNama", "kontakDaruratHubungan", "kontakDaruratPhone",
      "pendidikanTerakhir", "institusiPendidikan", "jurusan",
      "statusKaryawan",
      "npwp", "ptkpStatus", "jumlahTanggungan",
      "noBPJSKesehatan", "noBPJSTenagaKerja", "noBPJSPensiun",
      "bankName", "bankAccount", "bankAccountName",
      "fotoUrl", "ktpUrl", "npwpUrl", "ijazahUrl",
    ];

    const data: any = {};
    for (const f of allowedFields) {
      if (body[f] !== undefined) {
        data[f] = f === "tanggalLahir" ? (body[f] ? new Date(body[f]) : null) : body[f];
      }
    }

    // Check if profile is complete (required fields filled)
    const requiredFields = ["nik", "tempatLahir", "tanggalLahir", "jenisKelamin", "alamatKtp", "npwp", "ptkpStatus", "bankName", "bankAccount", "bankAccountName"];
    const isComplete = requiredFields.every((f) => data[f] || (body[f] !== undefined && body[f] !== ""));
    // Merge with existing to check completeness
    const existing = await db.employeeProfile.findUnique({ where: { userId: user.id } });
    const merged = { ...existing, ...data } as any;
    const complete = requiredFields.every((f) => merged[f]);
    data.isComplete = complete;
    if (complete && !existing?.isComplete) data.completedAt = new Date();

    const profile = await db.employeeProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    return ok({ profile });
  });
}
