"use client";

import { useEffect, useState, startTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { createDeviceAdapter } from "@/lib/ble";
import type { DeviceIdentity, NormalizedReadingBatch } from "@/lib/ble";
import { cn, formatMetric, formatTimestamp } from "@/lib/utils";

type ReadingRange = "24h" | "7d" | "30d";

type DashboardShellProps = {
  initialRange: ReadingRange;
  initialSummary: {
    latest: ReadingPoint | null;
    averages: Record<string, number | null>;
    history: ReadingPoint[];
    devices: DeviceRecord[];
    captureSessions: CaptureSessionRecord[];
  };
  initialThreads: ChatThreadRecord[];
  initialMessages: ChatMessageRecord[];
};

type DeviceRecord = {
  id: string;
  deviceName: string;
  manufacturer: string | null;
  model: string;
  serialNumber: string | null;
  firmwareVersion: string | null;
  pairedAt: string;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown>;
};

type CaptureSessionRecord = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
};

type ReadingPoint = {
  id: string;
  capturedAt: string;
  bodyTempC: number | null;
  roomTempC: number | null;
  spo2Percent: number | null;
  heartRateBpm: number | null;
  signalQuality: number | null;
  rawPayload: Record<string, unknown>;
};

type ChatThreadRecord = {
  id: string;
  title: string;
  deviceId: string | null;
  updatedAt: string;
};

type ChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

function SectionCard({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]", className)}>
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-5">
      <div className={cn("mb-3 h-2 w-14 rounded-full", accent)} />
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function OnlineBadge({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        online ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
      )}
    >
      {online ? "Online" : "Offline"}
    </span>
  );
}

export function DashboardShell({
  initialRange,
  initialSummary,
  initialThreads,
  initialMessages,
}: DashboardShellProps) {
  const [range, setRange] = useState<ReadingRange>(initialRange);
  const [summary, setSummary] = useState(initialSummary);
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<Record<string, ChatMessageRecord[]>>(
    initialThreads[0] ? { [initialThreads[0].id]: initialMessages } : {},
  );
  const [liveBatch, setLiveBatch] = useState<NormalizedReadingBatch | null>(null);
  const [status, setStatus] = useState("Idle");
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(initialSummary.devices[0]?.id ?? null);
  const [captureSessionId, setCaptureSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [error, setError] = useState<string | null>(null);
  const [adapter] = useState(() => createDeviceAdapter());

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function persistBatch(
    deviceId: string,
    currentCaptureSessionId: string | null,
    batch: NormalizedReadingBatch,
  ) {
    if (!online) {
      return;
    }

    const response = await fetch("/api/ble/readings/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId,
        captureSessionId: currentCaptureSessionId,
        batch,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error ?? "Unable to save reading");
    }
  }

  async function handleBatch(
    deviceId: string,
    currentCaptureSessionId: string | null,
    batch: NormalizedReadingBatch,
  ) {
    setLiveBatch(batch);

    setSummary((current) => ({
      ...current,
      latest: {
        id: crypto.randomUUID(),
        capturedAt: batch.capturedAt,
        bodyTempC: batch.metrics.bodyTempC ?? null,
        roomTempC: batch.metrics.roomTempC ?? null,
        spo2Percent: batch.metrics.spo2Percent ?? null,
        heartRateBpm: batch.metrics.heartRateBpm ?? null,
        signalQuality: batch.metrics.signalQuality ?? null,
        rawPayload: batch.rawPayload,
      },
      history: [
        ...current.history,
        {
          id: crypto.randomUUID(),
          capturedAt: batch.capturedAt,
          bodyTempC: batch.metrics.bodyTempC ?? null,
          roomTempC: batch.metrics.roomTempC ?? null,
          spo2Percent: batch.metrics.spo2Percent ?? null,
          heartRateBpm: batch.metrics.heartRateBpm ?? null,
          signalQuality: batch.metrics.signalQuality ?? null,
          rawPayload: batch.rawPayload,
        },
      ].slice(-80),
    }));

    try {
      await persistBatch(deviceId, currentCaptureSessionId, batch);
      setStatus("Streaming and synced");
    } catch (batchError) {
      setStatus("Streaming locally");
      setError(batchError instanceof Error ? batchError.message : "Failed to sync reading");
    }
  }

  async function refreshSummary(nextRange: ReadingRange) {
    const response = await fetch(`/api/readings/summary?range=${nextRange}`);
    if (!response.ok) {
      throw new Error("Unable to refresh dashboard");
    }

    const nextSummary = await response.json();
    setSummary(nextSummary);
    setActiveDeviceId(nextSummary.devices[0]?.id ?? null);
  }

  async function handleRangeChange(nextRange: ReadingRange) {
    setRange(nextRange);
    startTransition(() => {
      refreshSummary(nextRange).catch((rangeError) => {
        setError(rangeError instanceof Error ? rangeError.message : "Unable to load range");
      });
    });
  }

  async function handleConnect() {
    if (!online) {
      setError("Reconnect to the internet before starting a BLE session.");
      return;
    }

    setError(null);
    setIsBusy(true);

    try {
      setStatus("Scanning");
      await adapter.scanAndConnect();
      const metadata = await adapter.getDeviceMetadata();
      const pairedDevice = await pairDevice(metadata);
      setActiveDeviceId(pairedDevice.id);
      const sessionId = await createCaptureSession(pairedDevice.id, metadata);
      setCaptureSessionId(sessionId);

      await adapter.startStreaming((batch) => {
        void handleBatch(pairedDevice.id, sessionId, batch);
      });

      setStatus("Streaming live");
      setIsStreaming(true);
    } catch (connectError) {
      setStatus("Connection failed");
      setError(connectError instanceof Error ? connectError.message : "Unable to connect");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStop() {
    setIsBusy(true);

    try {
      await adapter.stopStreaming();

      if (captureSessionId) {
        await fetch(`/api/ble/capture-sessions/${captureSessionId}/complete`, {
          method: "POST",
        });
      }

      setStatus("Stopped");
      setIsStreaming(false);
      setCaptureSessionId(null);
      await refreshSummary(range);
    } finally {
      setIsBusy(false);
    }
  }

  async function pairDevice(metadata: DeviceIdentity) {
    const response = await fetch("/api/devices/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error ?? "Unable to pair device");
    }

    const result = await response.json();
    setSummary((current) => ({
      ...current,
      devices: [result.device, ...current.devices.filter((device) => device.id !== result.device.id)],
    }));
    return result.device as DeviceRecord;
  }

  async function createCaptureSession(deviceId: string, metadata: DeviceIdentity) {
    const response = await fetch("/api/ble/capture-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId,
        rawMetadata: {
          adapter: metadata.metadata?.adapter ?? "unknown",
        },
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error ?? "Unable to create capture session");
    }

    const result = await response.json();
    return result.captureSession.id as string;
  }

  async function ensureThread() {
    if (selectedThreadId) {
      return selectedThreadId;
    }

    const response = await fetch("/api/chat/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId: activeDeviceId,
      }),
    });

    const result = await response.json();
    const thread = result.thread as ChatThreadRecord;
    setThreads((current) => [thread, ...current]);
    setSelectedThreadId(thread.id);
    setMessages((current) => ({
      ...current,
      [thread.id]: [],
    }));
    return thread.id;
  }

  async function loadThreadMessages(threadId: string) {
    if (messages[threadId]) {
      return;
    }

    const response = await fetch(`/api/chat/threads/${threadId}/messages`);
    const result = await response.json();
    setMessages((current) => ({
      ...current,
      [threadId]: result.messages,
    }));
  }

  async function handleSendMessage() {
    if (!chatInput.trim()) {
      return;
    }

    if (!online) {
      setError("AI chat is unavailable offline.");
      return;
    }

    setChatBusy(true);
    setError(null);

    try {
      const threadId = await ensureThread();
      const content = chatInput.trim();
      setChatInput("");
      const response = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Unable to send message");
      }

      const result = await response.json();
      setMessages((current) => ({
        ...current,
        [threadId]: [...(current[threadId] ?? []), result.userMessage, result.assistantMessage],
      }));
      const threadsResponse = await fetch("/api/chat/threads");
      const threadsResult = await threadsResponse.json();
      setThreads(threadsResult.threads);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message");
    } finally {
      setChatBusy(false);
    }
  }

  function selectThread(threadId: string) {
    setSelectedThreadId(threadId);
    startTransition(() => {
      loadThreadMessages(threadId).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load messages");
      });
    });
  }

  const currentMessages = selectedThreadId ? messages[selectedThreadId] ?? [] : [];
  const latest = liveBatch
    ? {
        heartRateBpm: liveBatch.metrics.heartRateBpm ?? null,
        spo2Percent: liveBatch.metrics.spo2Percent ?? null,
        bodyTempC: liveBatch.metrics.bodyTempC ?? null,
        roomTempC: liveBatch.metrics.roomTempC ?? null,
        signalQuality: liveBatch.metrics.signalQuality ?? null,
      }
    : summary.latest;

  const chartData = summary.history.map((reading) => ({
    time: formatTimestamp(reading.capturedAt),
    heartRate: reading.heartRateBpm,
    spo2: reading.spo2Percent,
    bodyTemp: reading.bodyTempC,
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Live device control" eyebrow="BLE session">
          <div className="flex flex-wrap items-center gap-3">
            <OnlineBadge online={online} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600">
              {status}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isBusy || isStreaming}
              className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isBusy && !isStreaming ? "Connecting..." : "Pair and start demo stream"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={isBusy || !isStreaming}
              className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:opacity-60"
            >
              Stop session
            </button>
          </div>

          <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-5">
            <p className="text-sm text-slate-500">
              The custom BLE adapter is scaffolded but inactive until you provide the plaintext service and characteristic spec. The mock adapter simulates live heart rate, SpO2, temperature, PPG, and motion data so the rest of the app is fully wired today.
            </p>
          </div>

          {error ? (
            <div className="mt-5 rounded-[1.5rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-3">
            {summary.devices.length > 0 ? summary.devices.map((device) => (
              <div
                key={device.id}
                className={cn(
                  "rounded-[1.5rem] border px-4 py-4",
                  activeDeviceId === device.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{device.deviceName}</p>
                    <p className="text-sm text-slate-500">
                      {device.manufacturer ?? "Unknown maker"} · {device.model}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Last sync {formatTimestamp(device.lastSyncedAt)}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No paired devices yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Current body state" eyebrow="Live metrics">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Heart rate" value={formatMetric(latest?.heartRateBpm, "bpm")} accent="bg-rose-400" />
            <MetricCard label="SpO2" value={formatMetric(latest?.spo2Percent, "%", 1)} accent="bg-cyan-400" />
            <MetricCard label="Body temp" value={formatMetric(latest?.bodyTempC, "C", 1)} accent="bg-amber-400" />
            <MetricCard label="Room temp" value={formatMetric(latest?.roomTempC, "C", 1)} accent="bg-lime-400" />
            <MetricCard label="Signal quality" value={latest?.signalQuality?.toString() ?? "--"} accent="bg-indigo-400" />
            <MetricCard
              label="Capture time"
              value={summary.latest ? formatTimestamp(summary.latest.capturedAt) : "--"}
              accent="bg-slate-400"
            />
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Trend history" eyebrow="Stored readings">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(["24h", "7d", "30d"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRangeChange(value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium",
                    range === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              {summary.history.length} stored readings in this window
            </p>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#d7dee7" strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={24} stroke="#617084" />
                <YAxis stroke="#617084" />
                <Tooltip />
                <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2.2} dot={false} />
                <Line type="monotone" dataKey="bodyTemp" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard label="Avg heart rate" value={formatMetric(summary.averages.heartRateBpm, "bpm")} accent="bg-rose-300" />
            <MetricCard label="Avg SpO2" value={formatMetric(summary.averages.spo2Percent, "%", 1)} accent="bg-cyan-300" />
            <MetricCard label="Avg body temp" value={formatMetric(summary.averages.bodyTempC, "C", 1)} accent="bg-amber-300" />
          </div>
        </SectionCard>

        <SectionCard title="AI wellness coach" eyebrow="Persistent chat" className="flex h-full flex-col">
          <div className="mb-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Vitaloria Coach explains trends and offers wellness-oriented guidance. It does not diagnose conditions or replace a clinician.
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedThreadId(null)}
              className={cn(
                "rounded-full px-4 py-2 text-sm whitespace-nowrap",
                selectedThreadId === null ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              New thread
            </button>
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => selectThread(thread.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm whitespace-nowrap",
                  selectedThreadId === thread.id ? "bg-cyan-600 text-white" : "bg-cyan-50 text-cyan-800",
                )}
              >
                {thread.title}
              </button>
            ))}
          </div>

          <div className="min-h-[280px] flex-1 space-y-3 rounded-[1.5rem] bg-slate-50 p-4">
            {currentMessages.length > 0 ? currentMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-[1.25rem] px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-auto bg-slate-950 text-white"
                    : "bg-white text-slate-700 shadow-sm",
                )}
              >
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] opacity-60">
                  {message.role}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">
                Ask how your recent heart rate, SpO2, or temperature trends look and the coach will answer with the latest context.
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              rows={3}
              placeholder="What stands out in my recent recovery data?"
              className="min-h-24 flex-1 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={chatBusy}
              className="rounded-[1.5rem] bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
            >
              {chatBusy ? "Sending..." : "Send"}
            </button>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Recent capture sessions" eyebrow="Session log">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.captureSessions.length > 0 ? summary.captureSessions.map((session) => (
            <div key={session.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{session.status}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                Started {formatTimestamp(session.startedAt)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Ended {formatTimestamp(session.endedAt)}
              </p>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No capture sessions yet.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
