export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#155e75,_#020617_58%)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_32%,rgba(249,115,22,0.16)_88%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">BLE health intelligence</p>
            <h2 className="max-w-xl text-5xl font-semibold leading-tight">
              Sensor streams, wearable history, and a coach that can talk through what changed.
            </h2>
            <p className="max-w-lg text-base leading-7 text-slate-200">
              Built for Android Chrome PWA workflows with Web Bluetooth, PostgreSQL-backed health storage, and persistent chat threads tied to recent readings.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">{children}</div>
        </div>
      </div>
    </div>
  );
}
