import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET payroll detail
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const payroll = await db.payroll.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, role: true, position: true, phone: true } } },
    });
    if (!payroll) return err("Payroll tidak ditemukan", 404);

    // Team can only view own
    if (user.role !== ROLES.OWNER && payroll.userId !== user.id) {
      return err("Forbidden", 403);
    }
    return ok({ payroll });
  });
}

// Update payroll status (owner only: APPROVE / PAY)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { id } = await params;
    const body = await req.json();
    const { status, note, otherDeduction } = body;

    const data: any = {};
    if (status != null) {
      if (!["DRAFT", "APPROVED", "PAID"].includes(status)) return err("Status tidak valid", 400);
      data.status = status;
      if (status === "PAID") data.paidAt = new Date();
    }
    if (note != null) data.note = note;
    if (otherDeduction != null) {
      data.otherDeduction = Number(otherDeduction) || 0;
      // Recalculate net
      const existing = await db.payroll.findUnique({ where: { id } });
      if (existing) {
        data.totalDeduction = existing.attendanceDeduction + existing.bpjs + existing.tax + data.otherDeduction;
        data.netSalary = existing.grossSalary - data.totalDeduction;
      }
    }

    const payroll = await db.payroll.update({ where: { id }, data });
    return ok({ payroll });
  });
}

// Delete payroll (owner only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);
    const { id } = await params;
    await db.payroll.delete({ where: { id } });
    return ok({ success: true });
  });
}
