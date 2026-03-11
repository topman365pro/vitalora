"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const payload =
        mode === "register"
          ? {
              fullName: String(formData.get("fullName") ?? ""),
              email: String(formData.get("email") ?? ""),
              phone: String(formData.get("phone") ?? ""),
              password: String(formData.get("password") ?? ""),
            }
          : {
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
            };

      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Authentication failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/14 bg-slate-950/85 p-8 shadow-[0_30px_80px_rgba(4,10,24,0.45)] backdrop-blur">
      <div className="mb-8 space-y-3">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">Vitaloria</p>
        <h1 className="text-3xl font-semibold text-white">
          {mode === "login" ? "Return to your recovery board" : "Create your wearable wellness workspace"}
        </h1>
        <p className="text-sm leading-6 text-slate-300">
          Pair a BLE device, review sensor history, and chat with an AI coach about recent trends.
        </p>
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

        {mode === "register" ? (
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Phone</span>
            <input
              type="tel"
              name="phone"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
              placeholder="+62 812 ..."
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            name="password"
            minLength={8}
            required
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
            placeholder="Minimum 8 characters"
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
              ? "Sign in"
              : "Create account"}
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
