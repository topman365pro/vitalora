import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_38%,#fff7ed_100%)]">
      <header className="border-b border-slate-200/70 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Vitaloria</p>
            <Link href="/dashboard" className="text-2xl font-semibold">
              Recovery dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <PwaInstallButton />
            <div className="text-right text-sm text-slate-300">
              <p>{session.fullName}</p>
              <p>{session.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
