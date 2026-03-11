import { eq, sql } from "drizzle-orm";
import type { DecodedIdToken } from "firebase-admin/auth";

import { clearSessionCookie, createSessionFromIdToken } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { userLoginEvents, users } from "@/lib/db/schema";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/server/http";
import { sanitizeForwardedIp } from "@/lib/server/request";

type AuthMeta = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

type FirebaseUserProfile = {
  uid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function resolveFirebaseUserAction(params: {
  existingFirebaseUid: string | null;
  existingEmailUserId: string | null;
}) {
  if (params.existingFirebaseUid) {
    return "existing_firebase_uid" as const;
  }

  if (params.existingEmailUserId) {
    return "link_by_email" as const;
  }

  return "create_new" as const;
}

function toFirebaseProfile(decoded: DecodedIdToken): FirebaseUserProfile {
  const email = decoded.email ? normalizeEmail(decoded.email) : "";

  if (!email) {
    throw new ApiError("Firebase account is missing an email address", 400);
  }

  return {
    uid: decoded.uid,
    email,
    fullName: decoded.name?.trim() || email.split("@")[0] || "Vitaloria user",
    avatarUrl: decoded.picture ?? null,
    authProvider: decoded.firebase.sign_in_provider || "firebase",
    emailVerified: Boolean(decoded.email_verified),
  };
}

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
    ipAddress: sanitizeForwardedIp(params.ipAddress) ?? undefined,
  });
}

function isFirebaseAuthFailure(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  return code.startsWith("auth/");
}

export async function syncUserFromFirebaseClaims(decoded: DecodedIdToken) {
  const db = getDb();
  const profile = toFirebaseProfile(decoded);
  const [existingByUid] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, profile.uid))
    .limit(1);
  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.email}) = ${profile.email}`)
    .limit(1);

  const action = resolveFirebaseUserAction({
    existingFirebaseUid: existingByUid?.id ?? null,
    existingEmailUserId: existingByEmail?.id ?? null,
  });

  if (action === "existing_firebase_uid" && existingByUid) {
    const [user] = await db
      .update(users)
      .set({
        email: profile.email,
        fullName: profile.fullName || existingByUid.fullName,
        firebaseUid: profile.uid,
        authProvider: profile.authProvider,
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt:
          profile.emailVerified && !existingByUid.emailVerifiedAt
            ? new Date()
            : existingByUid.emailVerifiedAt,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingByUid.id))
      .returning();

    return user;
  }

  if (action === "link_by_email" && existingByEmail) {
    const [user] = await db
      .update(users)
      .set({
        email: profile.email,
        fullName: existingByEmail.fullName || profile.fullName,
        firebaseUid: profile.uid,
        authProvider: profile.authProvider,
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt:
          profile.emailVerified && !existingByEmail.emailVerifiedAt
            ? new Date()
            : existingByEmail.emailVerifiedAt,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingByEmail.id))
      .returning();

    return user;
  }

  const [user] = await db
    .insert(users)
    .values({
      email: profile.email,
      fullName: profile.fullName,
      passwordHash: null,
      firebaseUid: profile.uid,
      authProvider: profile.authProvider,
      avatarUrl: profile.avatarUrl,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      lastLoginAt: new Date(),
    })
    .returning();

  return user;
}

export async function exchangeFirebaseSession(idToken: string, meta: AuthMeta) {
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
    const user = await syncUserFromFirebaseClaims(decoded);
    await createSessionFromIdToken(idToken);
    await logLoginEvent({
      userId: user.id,
      emailAttempted: user.email,
      success: true,
      ...meta,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "invalid_firebase_token";

    console.error("firebase-session-exchange failed", {
      message,
      error,
      hasUserAgent: Boolean(meta.userAgent),
      hasIpAddress: Boolean(meta.ipAddress),
    });

    try {
      await logLoginEvent({
        emailAttempted: "firebase-session-exchange",
        success: false,
        failureReason: message,
        ...meta,
      });
    } catch (logError) {
      console.error("firebase-session-exchange log write failed", logError);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (isFirebaseAuthFailure(error)) {
      throw new ApiError("Unable to establish Firebase session", 401);
    }

    throw new ApiError("Unexpected server error", 500);
  }
}

export async function logoutUser() {
  await clearSessionCookie();
}
