"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  completeGoogleRedirect,
  exchangeUserForServerSession,
  getFirebaseAuthErrorMessage,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function handleRedirect() {
      try {
        const credential = await completeGoogleRedirect();

        if (!credential || cancelled) {
          return;
        }

        await exchangeUserForServerSession(credential.user);

        if (!cancelled) {
          router.push("/dashboard");
          router.refresh();
        }
      } catch (redirectError) {
        if (!cancelled) {
          setError(getFirebaseAuthErrorMessage(redirectError));
        }
      }
    }

    void handleRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const fullName = String(formData.get("fullName") ?? "");
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const credential =
        mode === "login"
          ? await signInWithEmail(email, password)
          : await registerWithEmail(fullName, email, password);

      await exchangeUserForServerSession(credential.user);
      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(getFirebaseAuthErrorMessage(submitError));
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGooglePending(true);
    setError(null);

    try {
      const credential = await signInWithGoogle();

      if (!credential) {
        return;
      }

      await exchangeUserForServerSession(credential.user);
      router.push("/dashboard");
      router.refresh();
    } catch (googleError) {
      setError(getFirebaseAuthErrorMessage(googleError));
    } finally {
      setIsGooglePending(false);
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
          Sign in with Google or a Firebase email/password account to access live device
          data, historical readings, and AI chat.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending || isGooglePending}
          className="flex w-full items-center justify-center rounded-full border border-white/16 bg-white/6 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          {isGooglePending ? "Connecting to Google..." : "Continue with Google"}
        </button>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          <span>Email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      <form
        action={async (formData) => {
          await handleSubmit(formData);
        }}
        className="mt-4 space-y-4"
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
            placeholder={mode === "login" ? "Your password" : "Create a password"}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending || isGooglePending}
          className="w-full rounded-full bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {isPending
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in with email"
              : "Create email account"}
        </button>
      </form>

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
