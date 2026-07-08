import { db } from "@/lib/db";
import { verifyPassword, createSession, setSessionCookie, safeUser } from "@/lib/auth";
import { ok, err, handleApi } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { email, password } = await req.json();
    if (!email || !password) return err("Email dan password wajib diisi", 400);

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return err("Email atau password salah", 401);
    if (!user.isActive) return err("Akun Anda dinonaktifkan. Hubungi owner.", 403);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return err("Email atau password salah", 401);

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return ok({ user: safeUser(user) });
  });
}
