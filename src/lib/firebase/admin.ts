import { getApp, getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { getEnv } from "@/lib/env";

export function normalizeFirebasePrivateKey(value: string) {
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted.replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: cert({
      projectId: getEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: normalizeFirebasePrivateKey(getEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
