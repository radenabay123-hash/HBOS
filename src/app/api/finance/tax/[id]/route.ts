import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Update tax payment (status, upload docs, pay)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();
    const { status, taxPaid, buktiPotongUrl, buktiBayarUrl, dokumenUrl, notes, reportedAt } = body;

    const data: any = {};
    if (status != null) {
      if (!["TERUTANG", "DIBAYAR", "DILAPORKAN"].includes(status)) return err("Status tidak valid", 400);
      data.status = status;
      if (status === "DIBAYAR") { data.paidAt = new Date(); data.taxPaid = taxPaid != null ? Number(taxPaid) : (await db.taxPayment.findUnique({ where: { id } }))?.taxDue; }
      if (status === "DILAPORKAN") data.reportedAt = new Date();
    }
    if (taxPaid != null) data.taxPaid = Number(taxPaid);
    if (buktiPotongUrl != null) data.buktiPotongUrl = buktiPotongUrl;
    if (buktiBayarUrl != null) data.buktiBayarUrl = buktiBayarUrl;
    if (dokumenUrl != null) data.dokumenUrl = dokumenUrl;
    if (notes != null) data.notes = notes;
    if (reportedAt != null) data.reportedAt = reportedAt ? new Date(reportedAt) : null;

    const payment = await db.taxPayment.update({ where: { id }, data });
    return ok({ payment });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);
    const { id } = await params;
    await db.taxPayment.delete({ where: { id } });
    return ok({ success: true });
  });
}
