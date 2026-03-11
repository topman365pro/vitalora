import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionCookieName, getSessionTtlDays } from "@/lib/env";
import { getDb } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";

function getExpiryDate() {
  const ttlDays = getSessionTtlDays();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  return expiresAt;
}

export async function createSession(userId: string) {
  const db = getDb();
  const headerStore = await headers();
  const cookieStore = await cookies();
  const sessionId = crypto.randomUUID();
  const expiresAt = getExpiryDate();

  await db.insert(authSessions).values({
    id: sessionId,
    userId,
    expiresAt,
    ipAddress: headerStore.get("x-forwarded-for") ?? undefined,
    userAgent: headerStore.get("user-agent") ?? undefined,
  });

  cookieStore.set(getSessionCookieName(), sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (sessionId) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.id, sessionId));
  }

  cookieStore.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    return null;
  }

  const db = getDb();
  const [session] = await db
    .select({
      sessionId: authSessions.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.id, sessionId), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  if (!session) {
    await deleteSession();
    return null;
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(authSessions.id, session.sessionId));

  return session;
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
