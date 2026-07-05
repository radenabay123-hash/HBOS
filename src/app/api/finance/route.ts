import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// List finance transactions
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const accountType = searchParams.get("accountType");

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = category;
    if (accountType) where.accountType = accountType;
    if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month);
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        where.date = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    const txns = await db.financeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, namaKlien: true } },
      },
    });
    return ok({ transactions: txns });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER && user.role !== ROLES.FINANCE) {
      return err("Forbidden", 403);
    }
    const body = await req.json();
    const {
      type, amount, description, category, subCategory,
      accountType, accountName, date, clientId,
      attachmentUrl, isTaxable, taxType, taxAmount,
      isPaid, dueDate, vendorName,
    } = body;
    if (!type || !amount) return err("Type dan amount wajib diisi", 400);
    if (!["PEMASUKAN", "PENGELUARAN", "TRANSFER"].includes(type)) return err("Type tidak valid", 400);

    const txn = await db.financeTransaction.create({
      data: {
        type, amount: Number(amount), description, category, subCategory,
        accountType: accountType || "BANK", accountName,
        date: date ? new Date(date) : new Date(),
        userId: user.id, clientId: clientId || null,
        attachmentUrl,
        isTaxable: isTaxable || false,
        taxType, taxAmount: taxAmount ? Number(taxAmount) : 0,
        isPaid: isPaid !== undefined ? isPaid : true,
        dueDate: dueDate ? new Date(dueDate) : null,
        vendorName,
      },
    });
    return ok({ transaction: txn });
  });
}
