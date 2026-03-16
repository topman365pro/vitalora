import { applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getOptionalEnv } from "@/lib/env";

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

  const projectId = getOptionalEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getOptionalEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getOptionalEnv("FIREBASE_PRIVATE_KEY");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizeFirebasePrivateKey(privateKey),
      }),
      projectId,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId ?? undefined,
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
