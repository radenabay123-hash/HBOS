import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET all employee profiles (owner only)
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const profiles = await db.employeeProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true, phone: true, position: true, isActive: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return ok({ profiles });
  });
}

// PUT update salary info (owner only)
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { userId, gajiPokok, tunjanganMakan, tunjanganTransport, statusKaryawan, tanggalMasuk } = body;

    if (!userId) return err("userId wajib diisi", 400);

    const data: any = {};
    if (gajiPokok !== undefined) data.gajiPokok = Number(gajiPokok);
    if (tunjanganMakan !== undefined) data.tunjanganMakan = Number(tunjanganMakan);
    if (tunjanganTransport !== undefined) data.tunjanganTransport = Number(tunjanganTransport);
    if (statusKaryawan !== undefined) data.statusKaryawan = statusKaryawan;
    if (tanggalMasuk !== undefined) data.tanggalMasuk = tanggalMasuk ? new Date(tanggalMasuk) : null;

    const profile = await db.employeeProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      include: { user: { select: { id: true, name: true, email: true, role: true, position: true } } },
    });

    // Also update SalaryConfig if gajiPokok changed
    if (gajiPokok !== undefined) {
      await db.salaryConfig.upsert({
        where: { userId },
        update: { baseSalary: Number(gajiPokok), mealAllowance: Number(tunjanganMakan || 0), transportAllowance: Number(tunjanganTransport || 0) },
        create: { userId, baseSalary: Number(gajiPokok), mealAllowance: Number(tunjanganMakan || 0), transportAllowance: Number(tunjanganTransport || 0) },
      });
    }

    return ok({ profile });
  });
}
