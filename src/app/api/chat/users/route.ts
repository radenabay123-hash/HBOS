import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, ROLE_LABELS } from "@/lib/constants";

export const runtime = "nodejs";

// GET — list all active users (for "start new chat" picker). Excludes self.
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const users = await db.user.findMany({
      where: { isActive: true, id: { not: user.id } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        position: true,
        phone: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return ok({
      users: users.map((u) => ({
        ...u,
        roleLabel: ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role,
      })),
    });
  });
}
