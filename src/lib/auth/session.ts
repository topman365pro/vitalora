import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionCookieName, getSessionTtlDays } from "@/lib/env";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type AuthSession = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function getSessionDurationMs() {
  return getSessionTtlDays() * 24 * 60 * 60 * 1000;
}

function getExpiryDate() {
  return new Date(Date.now() + getSessionDurationMs());
}

function mapDecodedSession(decodedToken: {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}) {
  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    displayName: decodedToken.name ?? null,
    photoURL: decodedToken.picture ?? null,
  } satisfies AuthSession;
}

export async function setSessionCookieValue(sessionCookie: string) {
  const expiresAt = getExpiryDate();
  const cookieStore = await cookies();

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

export async function createSessionFromIdToken(idToken: string) {
  const auth = getFirebaseAdminAuth();
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: getSessionDurationMs(),
  });

  await setSessionCookieValue(sessionCookie);
  return sessionCookie;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    return mapDecodedSession(decodedToken);
  } catch {
    await clearSessionCookie();
    return null;
  }
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;

  if (sessionCookie) {
    try {
      const decodedToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
      await getFirebaseAdminAuth().revokeRefreshTokens(decodedToken.uid);
    } catch {
      // Ignore invalid or already-expired cookies during logout.
    }
  }

  await clearSessionCookie();
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
