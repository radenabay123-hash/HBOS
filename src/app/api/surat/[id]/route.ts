import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    const body = await req.json();

    const data: any = {};
    const fields = [
      "suratType","suratNumber","perihal","lampiran","recipientName","recipientInstansi",
      "recipientAddress","body","activityDate","activityLocation","activityTime",
      "paymentAmountText","bookingAmountText","bankName","bankAccount","accountName",
      "headerContact","headerAddress1","headerAddress2","signatoryName","signatoryTitle","status","city",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.issueDate != null) data.issueDate = new Date(body.issueDate);
    if (body.includeActivity != null) data.includeActivity = body.includeActivity;
    if (body.includePayment != null) data.includePayment = body.includePayment;
    if (body.paymentAmount != null) data.paymentAmount = Number(body.paymentAmount);
    if (body.bookingAmount != null) data.bookingAmount = Number(body.bookingAmount);
    if (body.logoWidth != null) data.logoWidth = Number(body.logoWidth);

    const surat = await db.surat.update({ where: { id }, data });
    return ok({ surat });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER].includes(user.role as any)) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    await db.surat.delete({ where: { id } });
    return ok({ success: true });
  });
}
