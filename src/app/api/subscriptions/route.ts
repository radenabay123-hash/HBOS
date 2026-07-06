import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export const runtime = "nodejs";

const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// GET — list all subscriptions with payment status for given year/month
export async function GET(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || new Date().getFullYear());
    const month = Number(searchParams.get("month") || (new Date().getMonth() + 1));

    const subs = await db.subscription.findMany({
      where: { ownerId: user.id, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        payments: { where: { year, month } },
      },
    });

    // Group by category
    const grouped: Record<string, any[]> = {};
    let totalAmount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    for (const s of subs) {
      const cat = s.category || "Lainnya";
      if (!grouped[cat]) grouped[cat] = [];
      const isPaid = s.payments.length > 0 && s.payments[0].isPaid;
      grouped[cat].push({
        ...s,
        isPaid,
        paidAt: s.payments[0]?.paidAt || null,
        paymentId: s.payments[0]?.id || null,
      });
      totalAmount += s.amount;
      if (isPaid) totalPaid += s.amount;
      else totalUnpaid += s.amount;
    }

    return ok({ grouped, totalAmount, totalPaid, totalUnpaid, year, month, monthLabel: monthNames[month - 1] });
  });
}

// POST — create new subscription
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { name, category, amount, dueDay, description } = body;
    if (!name || amount == null) return err("Nama dan nominal wajib diisi", 400);

    const sub = await db.subscription.create({
      data: {
        name: String(name).trim(),
        category: String(category || "Pribadi").trim(),
        amount: Number(amount),
        dueDay: Number(dueDay) || 1,
        description: String(description || "").trim() || null,
        ownerId: user.id,
        isActive: true,
      },
    });
    return ok({ subscription: sub });
  });
}

// PUT — update subscription or toggle payment
export async function PUT(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const body = await req.json();
    const { action, id, name, category, amount, dueDay, description, isActive, year, month } = body;

    if (action === "toggle-payment") {
      // Toggle payment status for a specific month
      if (!id || !year || !month) return err("id, year, month wajib diisi", 400);
      const existing = await db.subscriptionPayment.findUnique({
        where: { subscriptionId_year_month: { subscriptionId: id, year, month } },
      });
      if (existing) {
        const updated = await db.subscriptionPayment.update({
          where: { id: existing.id },
          data: { isPaid: !existing.isPaid, paidAt: !existing.isPaid ? new Date() : null },
        });
        return ok({ payment: updated });
      } else {
        // Create new payment record (marking as paid)
        const created = await db.subscriptionPayment.create({
          data: { subscriptionId: id, year, month, isPaid: true, paidAt: new Date() },
        });
        return ok({ payment: created });
      }
    }

    // Update subscription details
    if (!id) return err("id wajib diisi", 400);
    const data: any = {};
    if (name != null) data.name = String(name).trim();
    if (category != null) data.category = String(category).trim();
    if (amount != null) data.amount = Number(amount);
    if (dueDay != null) data.dueDay = Number(dueDay);
    if (description != null) data.description = String(description).trim() || null;
    if (isActive != null) data.isActive = Boolean(isActive);

    const updated = await db.subscription.update({ where: { id }, data });
    return ok({ subscription: updated });
  });
}

// DELETE — delete subscription
export async function DELETE(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden: hanya owner", 403);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return err("id wajib diisi", 400);

    await db.subscription.delete({ where: { id } });
    return ok({ success: true });
  });
}
