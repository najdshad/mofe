import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "mofe_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 10;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const activeCount = await prisma.session.count({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  if (activeCount >= MAX_SESSIONS) {
    const oldest = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastActivityAt: "asc" },
    });
    if (oldest) {
      await prisma.session.update({
        where: { id: oldest.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  if (session.lastActivityAt) {
    const idleMs = Date.now() - session.lastActivityAt.getTime();
    if (idleMs > IDLE_TIMEOUT_MS) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return null;
    }
  }

  if (!session.lastActivityAt || session.lastActivityAt < new Date(Date.now() - 5 * 60 * 1000)) {
    try {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });
    } catch {
      // non-critical; session still valid
    }
  }

  return session.user;
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  cookieStore.delete(SESSION_COOKIE);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(userId: string) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function validatePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  return record;
}

export async function consumePasswordResetToken(id: string) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
