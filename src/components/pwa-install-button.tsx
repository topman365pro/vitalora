"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstalling(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  }

  if (isInstalled) {
    return (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
        App installed
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={!deferredPrompt || isInstalling}
      className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
      title={
        deferredPrompt
          ? "Install Vitaloria as an app"
          : "Install becomes available when the browser exposes the PWA prompt"
      }
    >
      {isInstalling ? "Installing..." : "Add as app"}
    </button>
  );
}
