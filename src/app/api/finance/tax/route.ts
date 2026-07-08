import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET tax payments (with calendar)
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const status = searchParams.get("status");

    const where: any = {};
    if (year) {
      where.period = { contains: year };
    }
    if (status) where.status = status;

    const payments = await db.taxPayment.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    // Summary
    const totalTerutang = payments.filter((p) => p.status === "TERUTANG").reduce((s, p) => s + (p.taxDue - p.taxPaid), 0);
    const totalDibayar = payments.filter((p) => p.status === "DIBAYAR").reduce((s, p) => s + p.taxPaid, 0);
    const totalDilaporkan = payments.filter((p) => p.status === "DILAPORKAN").reduce((s, p) => s + p.taxDue, 0);

    // Tax calendar (upcoming due dates)
    const now = new Date();
    const upcoming = payments.filter((p) => p.dueDate >= now && p.status !== "DIBAYAR").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return ok({
      payments,
      summary: { totalTerutang, totalDibayar, totalDilaporkan, count: payments.length },
      upcoming,
    });
  });
}

// POST create tax payment (Owner + Finance)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);

    const body = await req.json();
    const { taxType, period, periodType, masaPajak, taxableAmount, taxRate, taxDue, dueDate, npwp, notes, buktiPotongUrl, buktiBayarUrl, dokumenUrl } = body;
    if (!taxType || !period || !taxableAmount || taxDue == null) return err("Field wajib tidak lengkap", 400);

    const payment = await db.taxPayment.create({
      data: {
        taxType, period, periodType: periodType || "BULANAN",
        masaPajak, taxableAmount: Number(taxableAmount),
        taxRate: Number(taxRate) || 0, taxDue: Number(taxDue),
        status: "TERUTANG",
        dueDate: new Date(dueDate),
        npwp, notes, buktiPotongUrl, buktiBayarUrl, dokumenUrl,
      },
    });
    return ok({ payment });
  });
}
