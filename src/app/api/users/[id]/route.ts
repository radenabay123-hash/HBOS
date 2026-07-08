import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, safeUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";
import { ROLES, TEAM_ROLES } from "@/lib/constants";

export const runtime = "nodejs";

// Update user (owner only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const me = await getCurrentUser();
    if (!me) return err("Unauthorized", 401);
    if (me.role !== ROLES.OWNER) return err("Forbidden", 403);

    const { id } = await params;
    const body = await req.json();
    const { name, email, password, role, phone, position, isActive } = body;

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return err("User tidak ditemukan", 404);

    const data: any = {};
    if (name != null) data.name = name;
    if (email != null) data.email = email.toLowerCase().trim();
    if (phone != null) data.phone = phone;
    if (position != null) data.position = position;
    if (isActive != null) data.isActive = isActive;
    if (role != null) {
      if (!TEAM_ROLES.includes(role)) return err("Role tidak valid", 400);
      data.role = role;
    }
    if (password) data.password = await hashPassword(password);

    const updated = await db.user.update({ where: { id }, data });
    return ok({ user: safeUser(updated) });
  });
}

// Delete user (owner only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const me = await getCurrentUser();
    if (!me) return err("Unauthorized", 401);
    if (me.role !== ROLES.OWNER) return err("Forbidden", 403);

    const { id } = await params;
    if (id === me.id) return err("Tidak bisa menghapus akun sendiri", 400);

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return err("User tidak ditemukan", 404);
    if (target.role === ROLES.OWNER) return err("Tidak bisa menghapus akun owner", 400);

    await db.user.delete({ where: { id } });
    return ok({ success: true });
  });
}
