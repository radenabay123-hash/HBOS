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
      attachmentUrl, isTaxable, taxType, taxAmount, taxIncluded,
      isPaid, dueDate, vendorName,
      kontakName, projectName, trainerName, invoiceNumber, receiptNumber,
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
    if (taxIncluded != null) data.taxIncluded = taxIncluded;
    if (isPaid != null) data.isPaid = isPaid;
    if (dueDate != null) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (vendorName != null) data.vendorName = vendorName;
    if (kontakName != null) data.kontakName = kontakName;
    if (projectName != null) data.projectName = projectName;
    if (trainerName != null) data.trainerName = trainerName;
    if (invoiceNumber != null) data.invoiceNumber = invoiceNumber;
    if (receiptNumber != null) data.receiptNumber = receiptNumber;

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
