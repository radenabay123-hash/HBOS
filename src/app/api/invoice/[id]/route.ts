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
    if (body.invoiceNumber != null) data.invoiceNumber = body.invoiceNumber;
    if (body.issueDate != null) data.issueDate = new Date(body.issueDate);
    if (body.clientName != null) data.clientName = body.clientName;
    if (body.clientAddress != null) data.clientAddress = body.clientAddress;
    if (body.city != null) data.city = body.city;
    if (body.description != null) data.description = body.description;
    if (body.items != null) data.items = JSON.stringify(body.items);
    if (body.subtotal != null) data.subtotal = Number(body.subtotal);
    if (body.discount != null) data.discount = Number(body.discount);
    if (body.tax != null) data.tax = Number(body.tax);
    if (body.totalAmount != null) data.totalAmount = Number(body.totalAmount);
    if (body.status != null) data.status = body.status;
    if (body.paymentInstruction != null) data.paymentInstruction = body.paymentInstruction;
    if (body.terms != null) data.terms = body.terms;
    if (body.note != null) data.note = body.note;
    if (body.bankName != null) data.bankName = body.bankName;
    if (body.bankAccount != null) data.bankAccount = body.bankAccount;
    if (body.accountName != null) data.accountName = body.accountName;

    const invoice = await db.invoice.update({ where: { id }, data });
    return ok({ invoice });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }
    const { id } = await params;
    await db.invoice.delete({ where: { id } });
    return ok({ success: true });
  });
}
