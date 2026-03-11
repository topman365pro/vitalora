import { desc, eq, sql } from "drizzle-orm";

import { createSession, deleteSession, requireSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { authSessions, userLoginEvents, users } from "@/lib/db/schema";
import { ApiError } from "@/lib/server/http";
import type { LoginInput, RegisterInput } from "@/lib/server/validation";

async function logLoginEvent(params: {
  userId?: string | null;
  emailAttempted: string;
  success: boolean;
  failureReason?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const db = getDb();
  await db.insert(userLoginEvents).values({
    userId: params.userId ?? undefined,
    emailAttempted: params.emailAttempted,
    success: params.success,
    failureReason: params.success ? null : params.failureReason ?? "unknown",
    userAgent: params.userAgent ?? undefined,
    ipAddress: params.ipAddress ?? undefined,
  });
}

export async function registerUser(input: RegisterInput) {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      passwordHash,
    })
    .returning({
      id: users.id,
    });

  await createSession(user.id);
  return user;
}

export async function loginUser(
  input: LoginInput,
  meta: { userAgent?: string | null; ipAddress?: string | null },
) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, input.email.trim().toLowerCase()))
    .limit(1);

  if (!user) {
    await logLoginEvent({
      emailAttempted: input.email,
      success: false,
      failureReason: "user_not_found",
      ...meta,
    });
    throw new ApiError("Invalid email or password", 401);
  }

  const isValid = await verifyPassword(user.passwordHash, input.password);

  if (!isValid) {
    await logLoginEvent({
      userId: user.id,
      emailAttempted: input.email,
      success: false,
      failureReason: "invalid_password",
      ...meta,
    });
    throw new ApiError("Invalid email or password", 401);
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  await logLoginEvent({
    userId: user.id,
    emailAttempted: input.email,
    success: true,
    ...meta,
  });

  await createSession(user.id);
  return user;
}

export async function logoutUser() {
  await deleteSession();
}

export async function getAuthenticatedUser() {
  return requireSession();
}

export async function listActiveSessions(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(authSessions)
    .where(eq(authSessions.userId, userId))
    .orderBy(desc(authSessions.createdAt));
}
