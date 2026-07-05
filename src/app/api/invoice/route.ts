import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET invoices
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const invoices = await db.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
    });
    return ok({ invoices });
  });
}

// POST create invoice
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();
    const {
      invoiceNumber, issueDate, clientName, clientAddress, city, description,
      items, subtotal, discount, tax, totalAmount, status,
      paymentInstruction, terms, note,
      bankName, bankAccount, accountName,
    } = body;

    if (!invoiceNumber || !clientName || !items || !issueDate) {
      return err("Nomor invoice, klien, tanggal, dan items wajib diisi", 400);
    }

    const existing = await db.invoice.findUnique({ where: { invoiceNumber } });
    if (existing) return err("Nomor invoice sudah ada", 400);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        issueDate: new Date(issueDate),
        clientName,
        clientAddress: clientAddress || null,
        city: city || null,
        description: description || null,
        items: JSON.stringify(items),
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount: Number(totalAmount) || 0,
        status: status || "PENDING",
        paymentInstruction: paymentInstruction || null,
        terms: terms || null,
        note: note || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        accountName: accountName || null,
        createdById: user.id,
      },
    });

    return ok({ invoice });
  });
}
