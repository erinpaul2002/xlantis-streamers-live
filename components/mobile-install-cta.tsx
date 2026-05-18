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
  const [hasHydrated, setHasHydrated] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const isiOSSafari = useMemo(() => isAppleMobileDevice() && isSafariBrowser(), []);

  useEffect(() => {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const hydrateState = () => {
      setHasHydrated(true);

      try {
        setIsDismissed(window.localStorage.getItem("xlantis-live-install-cta-dismissed") === "true");
      } catch {
        setIsDismissed(false);
      }

      setIsInstalled(isStandaloneDisplayMode());
    };

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

    const hydrateTimer = window.setTimeout(hydrateState, 0);
    displayModeQuery.addEventListener("change", syncInstallState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(hydrateTimer);
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

  function handleDismiss() {
    setIsDismissed(true);

    try {
      window.localStorage.setItem("xlantis-live-install-cta-dismissed", "true");
    } catch {
      // Ignore storage errors and just dismiss for the current session.
    }
  }

  if (!hasHydrated || isInstalled || isDismissed) {
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
      <div className="overflow-hidden rounded-2xl border border-[#53fc18]/18 bg-[linear-gradient(135deg,rgba(83,252,24,0.12),rgba(8,10,13,0.96)_58%)] shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8dff63]">Mobile app</div>
            <p className="mt-0.5 text-xs font-bold text-white sm:text-sm">Install Xlantis Live on your phone</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              className="flex h-9 items-center justify-center rounded-lg bg-[#53fc18] px-3 text-xs font-black text-black transition active:scale-[0.98]"
              type="button"
              onClick={() => void handleInstallClick()}
            >
              Install app
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/6 text-[10px] font-black text-[#d5dbe2]"
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
            >
              X
            </button>
          </div>
        </div>

        {(isPanelOpen || helperMessage) ? (
          <div className="border-t border-white/10 bg-black/16 px-3 py-2.5">
            <div className="grid gap-2">
              {helperMessage ? <p className="text-sm font-semibold text-[#d5dbe2]">{helperMessage}</p> : panelBody}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
