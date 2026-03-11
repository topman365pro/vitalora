import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionCookieName, getSessionTtlDays } from "@/lib/env";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export function getSessionDurationMs() {
  return getSessionTtlDays() * 24 * 60 * 60 * 1000;
}

function getExpiryDate() {
  return new Date(Date.now() + getSessionDurationMs());
}

export async function createSessionFromIdToken(idToken: string) {
  const cookieStore = await cookies();
  const adminAuth = getFirebaseAdminAuth();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: getSessionDurationMs(),
  });
  const expiresAt = getExpiryDate();

  cookieStore.set(getSessionCookieName(), sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });

  return expiresAt;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

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
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);

    const db = getDb();
    const [user] = await db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        firebaseUid: users.firebaseUid,
      })
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (!user) {
      await clearSessionCookie();
      return null;
    }

    return user;
  } catch {
    await clearSessionCookie();
    return null;
  }
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
