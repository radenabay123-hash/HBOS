import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, safeUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, TEAM_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// List all users (owner only)
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden", 403);

    const users = await db.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true, email: true, name: true, role: true,
        phone: true, avatar: true, position: true, isActive: true,
        createdAt: true,
        _count: { select: { tasks: true, contentIdeas: true, articles: true } },
      },
    });
    return ok({ users });
  });
}

// Create user (owner only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);
    if (user.role !== ROLES.OWNER) return err("Forbidden", 403);

    const body = await req.json();
    const { name, email, password, role, phone, position } = body;
    if (!name || !email || !password || !role) {
      return err("Nama, email, password, dan role wajib diisi", 400);
    }
    if (!TEAM_ROLES.includes(role)) {
      return err("Role tidak valid. Owner tidak bisa dibuat via API.", 400);
    }
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return err("Email sudah terdaftar", 400);

    const hashed = await hashPassword(password);
    const newUser = await db.user.create({
      data: {
        name, email: email.toLowerCase().trim(), password: hashed,
        role, phone, position,
      },
    });
    return ok({ user: safeUser(newUser) });
  });
}
