import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// PUT toggle/update checklist item
// Body: { checklist: [{item, done}] } or { itemIndex: number }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    const { id } = await params;

    const existing = await db.dailyAgenda.findFirst({ where: { id, userId: user.id } });
    if (!existing) return err("Agenda tidak ditemukan", 404);

    const body = await req.json();
    let checklist: any[] = [];
    try {
      checklist = existing.checklist ? JSON.parse(existing.checklist) : [];
    } catch { checklist = []; }

    if (body.checklist) {
      // Replace entire checklist
      checklist = body.checklist;
    } else if (body.itemIndex !== undefined) {
      // Toggle single item
      if (checklist[body.itemIndex]) {
        checklist[body.itemIndex].done = !checklist[body.itemIndex].done;
      }
    } else if (body.newItem) {
      // Add new item
      checklist.push({ item: body.newItem, done: false });
    } else if (body.removeItem !== undefined) {
      // Remove item
      checklist.splice(body.removeItem, 1);
    }

    const agenda = await db.dailyAgenda.update({
      where: { id },
      data: { checklist: JSON.stringify(checklist) },
    });

    return ok({ agenda, checklist });
  });
}
