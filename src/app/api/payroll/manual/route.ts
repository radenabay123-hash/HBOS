import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

// POST: Manual create/update payroll (owner only)
// Body: { userId, month, year, baseSalary, tunjangan, potongan, note, bankName, bankAccount, accountName, nik, jabatan, status }
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const {
      userId, month, year,
      baseSalary, tunjangan, potongan,
      note, bankName, bankAccount, accountName, nik, jabatan, status,
    } = body;

    if (!userId || !month || !year) return err("userId, month, year wajib diisi", 400);

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, position: true },
    });
    if (!targetUser) return err("Karyawan tidak ditemukan", 404);

    const m = Number(month);
    const y = Number(year);
    const base = Number(baseSalary) || 0;
    const tunj = Number(tunjangan) || 0;
    const pot = Number(potongan) || 0;

    const grossSalary = base + tunj;
    const totalDeduction = pot;
    const netSalary = grossSalary - totalDeduction;

    const data: any = {
      baseSalary: base,
      mealAllowance: 0,
      transportAllowance: tunj, // store tunjangan as transportAllowance for manual
      grossSalary,
      attendanceDeduction: 0,
      bpjs: 0,
      tax: 0,
      otherDeduction: pot, // store potongan as otherDeduction for manual
      totalDeduction,
      netSalary,
      isManual: true,
      nik: nik || null,
      jabatan: jabatan || targetUser.position || ROLE_LABELS[targetUser.role] || null,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
      accountName: accountName || null,
      periodeLabel: getMonthLabel(m) + " " + y,
      note: note || null,
      status: status || "DRAFT",
      paidAt: status === "PAID" ? new Date() : null,
      // Reset attendance fields for manual
      workingDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0,
      kpiScore: 0, kpiBonus: 0,
    };

    const payroll = await db.payroll.upsert({
      where: { userId_month_year: { userId, month: m, year: y } },
      update: data,
      create: {
        userId, month: m, year: y, ...data,
      },
      include: { user: { select: { id: true, name: true, role: true, position: true } } },
    });

    return ok({ payroll });
  });
}

// GET: Archive list of all payrolls (owner only)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");

    const where: any = {};
    if (year) where.year = Number(year);

    const payrolls = await db.payroll.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }, { user: { name: "asc" } }],
      include: { user: { select: { id: true, name: true, role: true, position: true } } },
    });

    return ok({ payrolls });
  });
}

function getMonthLabel(m: number): string {
  const names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return names[m - 1] || "";
}
