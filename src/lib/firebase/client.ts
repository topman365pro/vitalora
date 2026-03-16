"use client";

import { FirebaseError, initializeApp, getApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";

import { getFirebaseClientConfig } from "@/lib/env";

function getFirebaseClientApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseClientConfig());
}

export function getFirebaseClientAuth() {
  return getAuth(getFirebaseClientApp());
}

function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });
  return provider;
}

function isRedirectFallbackError(error: FirebaseError) {
  return (
    error.code === "auth/popup-blocked" ||
    error.code === "auth/operation-not-supported-in-this-environment"
  );
}

export async function signInWithGoogle() {
  const auth = getFirebaseClientAuth();
  const provider = getGoogleProvider();

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (error instanceof FirebaseError && isRedirectFallbackError(error)) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw error;
  }
}

export async function completeGoogleRedirect() {
  return getRedirectResult(getFirebaseClientAuth());
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseClientAuth(), email, password);
}

export async function registerWithEmail(fullName: string, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(getFirebaseClientAuth(), email, password);

  await updateProfile(credential.user, {
    displayName: fullName.trim(),
  });

  await credential.user.getIdToken(true);

  return credential;
}

export async function signOutFirebase() {
  await signOut(getFirebaseClientAuth());
}

export async function exchangeUserForServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to establish Firebase session");
  }
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  const code =
    error instanceof FirebaseError
      ? error.code
      : typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "Unexpected server error";

  if (!code) {
    return message;
  }

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "That email is already in use.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/account-exists-with-different-credential":
      return "This email is already connected to a different sign-in method.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished.";
    case "auth/popup-blocked":
      return "The popup was blocked. The app will switch to redirect sign-in.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    default:
      return message || "Unexpected server error";
  }
}

export type { UserCredential };
