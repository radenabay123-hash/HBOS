import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

// List all active team members (any authenticated user can view)
// Returns only public info: name, role, position, phone, email, avatar
export async function GET() {
  return handleApi(async () => {
    const user = await getCurrentUser();
    if (!user) return err("Unauthorized", 401);

    const users = await db.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        position: true,
        createdAt: true,
        employeeProfile: {
          select: {
            nik: true,
            tempatLahir: true,
            tanggalLahir: true,
            npwp: true,
            bankName: true,
            bankAccount: true,
          },
        },
      },
    });
    return ok({ users });
  });
}
