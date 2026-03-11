"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  exchangeFirebaseSession,
  signInWithFirebaseEmail,
  signInWithFirebaseGoogle,
  signUpWithFirebaseEmail,
} from "@/lib/firebase/client";
import { mapFirebaseAuthError } from "@/lib/firebase/errors";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function completeSignIn() {
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const fullName = String(formData.get("fullName") ?? "");
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const user =
        mode === "register"
          ? await signUpWithFirebaseEmail(fullName, email, password)
          : await signInWithFirebaseEmail(email, password);

      await exchangeFirebaseSession(user);
      await completeSignIn();
    } catch (submitError) {
      setError(mapFirebaseAuthError(submitError));
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsPending(true);
    setError(null);

    try {
      const user = await signInWithFirebaseGoogle();
      await exchangeFirebaseSession(user);
      await completeSignIn();
    } catch (signInError) {
      setError(mapFirebaseAuthError(signInError));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/14 bg-slate-950/85 p-8 shadow-[0_30px_80px_rgba(4,10,24,0.45)] backdrop-blur">
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">Vitaloria</p>
        <h1 className="text-3xl font-semibold text-white">
          {mode === "login"
            ? "Return to your recovery board"
            : "Create your wearable wellness workspace"}
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          Sign in with Google or Firebase email/password, then sync that identity to
          your Vitaloria data.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isPending}
        className="mb-4 flex w-full items-center justify-center gap-3 rounded-full border border-white/14 bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
      >
        <span className="text-base">G</span>
        {isPending ? "Working..." : "Continue with Google"}
      </button>

      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        Or use email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form
        action={async (formData) => {
          await handleSubmit(formData);
        }}
        className="space-y-4"
      >
        {mode === "register" ? (
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Full name</span>
            <input
              name="fullName"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/50"
              placeholder="Arham Faris"
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
            placeholder="name@example.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            name="password"
            minLength={8}
            required
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
            placeholder={mode === "login" ? "Your Firebase password" : "Create a Firebase password"}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {isPending
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in with email"
              : "Create Firebase account"}
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-100">
        Existing Vitaloria users should sign in with the same email they already used so
        your stored device, reading, and chat history links automatically.
      </div>

      <p className="mt-6 text-sm text-slate-300">
        {mode === "login" ? "Need an account?" : "Already registered?"}{" "}
        <Link
          href={mode === "login" ? "/register" : "/login"}
          className="font-semibold text-cyan-300 hover:text-cyan-200"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
