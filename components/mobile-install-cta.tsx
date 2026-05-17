"use client";

import { useEffect, useMemo, useState } from "react";

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isAppleMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const appleMobilePattern = /iPad|iPhone|iPod/;
  const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return appleMobilePattern.test(userAgent) || ipadDesktopMode;
}

function isSafariBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;

  return /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(userAgent);
}

export function MobileInstallCta() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode());
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const isiOSSafari = useMemo(() => isAppleMobileDevice() && isSafariBrowser(), []);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstallState = () => {
      setIsInstalled(isStandaloneDisplayMode());
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setHelperMessage(null);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsPanelOpen(false);
      setHelperMessage(null);
    };

    syncInstallState();
    displayModeQuery.addEventListener("change", syncInstallState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      displayModeQuery.removeEventListener("change", syncInstallState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      setHelperMessage(null);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsPanelOpen(false);
        return;
      }

      setHelperMessage("Install prompt dismissed. You can try again whenever you're ready.");
      return;
    }

    setIsPanelOpen((current) => !current);
  }

  if (isInstalled) {
    return null;
  }

  const panelBody = isiOSSafari ? (
    <>
      <p className="text-sm font-semibold text-[#d5dbe2]">
        Install on iPhone or iPad by opening the Share menu and choosing <span className="text-white">Add to Home Screen</span>.
      </p>
      <p className="text-xs font-semibold text-[#8e98a3]">
        Safari is required on iOS for home screen installation.
      </p>
    </>
  ) : (
    <>
      <p className="text-sm font-semibold text-[#d5dbe2]">
        Open this site in Safari on iPhone or Chrome on Android to install it like an app.
      </p>
      <p className="text-xs font-semibold text-[#8e98a3]">
        If your browser supports direct install prompts, this button will open it automatically.
      </p>
    </>
  );

  return (
    <div className="md:hidden">
      <div className="overflow-hidden rounded-2xl border border-[#53fc18]/22 bg-[linear-gradient(135deg,rgba(83,252,24,0.16),rgba(8,10,13,0.95)_58%)] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8dff63]">Mobile app</div>
            <p className="mt-1 text-sm font-bold text-white">Install Xlantis Live on your phone</p>
          </div>

          <button
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#53fc18] px-4 text-sm font-black text-black transition active:scale-[0.98]"
            type="button"
            onClick={() => void handleInstallClick()}
          >
            Install app
          </button>
        </div>

        {(isPanelOpen || helperMessage) ? (
          <div className="border-t border-white/10 bg-black/16 px-4 py-3">
            <div className="grid gap-2">
              {helperMessage ? <p className="text-sm font-semibold text-[#d5dbe2]">{helperMessage}</p> : panelBody}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
