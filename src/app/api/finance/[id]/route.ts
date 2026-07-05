import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();
    const {
      type, amount, description, category, subCategory,
      accountType, accountName, date, clientId,
      attachmentUrl, isTaxable, taxType, taxAmount,
      isPaid, dueDate, vendorName,
    } = body;

    const data: any = {};
    if (type != null) data.type = type;
    if (amount != null) data.amount = Number(amount);
    if (description != null) data.description = description;
    if (category != null) data.category = category;
    if (subCategory != null) data.subCategory = subCategory;
    if (accountType != null) data.accountType = accountType;
    if (accountName != null) data.accountName = accountName;
    if (date != null) data.date = new Date(date);
    if (clientId != null) data.clientId = clientId || null;
    if (attachmentUrl != null) data.attachmentUrl = attachmentUrl;
    if (isTaxable != null) data.isTaxable = isTaxable;
    if (taxType != null) data.taxType = taxType;
    if (taxAmount != null) data.taxAmount = Number(taxAmount);
    if (isPaid != null) data.isPaid = isPaid;
    if (dueDate != null) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (vendorName != null) data.vendorName = vendorName;

    const txn = await db.financeTransaction.update({ where: { id }, data });
    return ok({ transaction: txn });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) return err("Forbidden", 403);
    const { id } = await params;
    await db.financeTransaction.delete({ where: { id } });
    return ok({ success: true });
  });
}
