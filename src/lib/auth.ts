import { db } from "./db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ROLES, type Role } from "./constants";

const SESSION_COOKIE = "hbos_session";
const SESSION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await db.session.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== ROLES.OWNER) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

// Safe user object for client (no password)
export function safeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
  position?: string | null;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    position: user.position,
    isActive: user.isActive,
  };
}

export type SafeUser = ReturnType<typeof safeUser>;
