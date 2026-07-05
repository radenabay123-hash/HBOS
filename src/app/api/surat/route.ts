import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// GET surat list
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const suratType = searchParams.get("suratType");

    const where: any = {};
    if (status) where.status = status;
    if (suratType) where.suratType = suratType;

    const surats = await db.surat.findMany({
      where,
      orderBy: { issueDate: "desc" },
    });
    return ok({ surats });
  });
}

// POST create surat
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (![ROLES.OWNER, ROLES.PROJECT_MANAGER, ROLES.FINANCE].includes(user.role as any)) {
      return err("Forbidden", 403);
    }

    const body = await req.json();

    // Auto-generate surat number if not provided
    let suratNumber = body.suratNumber;
    if (!suratNumber) {
      const count = await db.surat.count();
      const now = new Date();
      const romanMonths = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
      const seq = String(count + 1).padStart(3, "0");
      suratNumber = `${seq}/SP/HAN/${romanMonths[now.getMonth()]}/${now.getFullYear()}`;
    }

    // Check unique
    const existing = await db.surat.findUnique({ where: { suratNumber } });
    if (existing) return err("Nomor surat sudah ada", 400);

    const surat = await db.surat.create({
      data: {
        suratType: body.suratType || "Surat Penawaran",
        suratNumber,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        city: body.city || "Jombang",
        perihal: body.perihal || null,
        lampiran: body.lampiran || null,
        recipientName: body.recipientName || null,
        recipientInstansi: body.recipientInstansi || null,
        recipientAddress: body.recipientAddress || null,
        body: body.body || "",
        includeActivity: body.includeActivity || false,
        activityDate: body.activityDate || null,
        activityLocation: body.activityLocation || null,
        activityTime: body.activityTime || null,
        includePayment: body.includePayment || false,
        paymentAmount: body.paymentAmount ? Number(body.paymentAmount) : null,
        paymentAmountText: body.paymentAmountText || null,
        bookingAmount: body.bookingAmount ? Number(body.bookingAmount) : null,
        bookingAmountText: body.bookingAmountText || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        accountName: body.accountName || null,
        logoWidth: body.logoWidth ? Number(body.logoWidth) : 144,
        headerContact: body.headerContact || null,
        headerAddress1: body.headerAddress1 || null,
        headerAddress2: body.headerAddress2 || null,
        signatoryName: body.signatoryName || "M. Aqil Baihaqi",
        signatoryTitle: body.signatoryTitle || "Direktur Utama",
        status: body.status || "DRAFT",
        createdById: user.id,
      },
    });

    return ok({ surat });
  });
}
