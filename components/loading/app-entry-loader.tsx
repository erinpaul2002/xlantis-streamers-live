"use client";

import { useEffect, useState } from "react";
import {
  getAvailableLoadingScreenIds,
  type LoadingScreenId,
} from "@/components/loading/loading-screen-ids";
import { useIsMobileLoadingViewport } from "@/components/loading/loading-screen-device";
import { LoadingScreenRenderer } from "@/components/loading/loading-screen-renderer";
import { loadingRevealDurations } from "@/components/loading/loading-screen-config";
import type { LoadingScreenPhase } from "@/components/loading/loading-screen-types";

const initialLoadingDuration = 2600;

export function AppEntryLoader() {
  const [animationId, setAnimationId] = useState<LoadingScreenId | null>(null);
  const [phase, setPhase] = useState<LoadingScreenPhase | "hidden">("loading");
  const [hasMinimumDelayElapsed, setHasMinimumDelayElapsed] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const isMobileViewport = useIsMobileLoadingViewport();

  useEffect(() => {
    const availableIds = getAvailableLoadingScreenIds(isMobileViewport);
    const timer = window.setTimeout(() => {
      setAnimationId(availableIds[Math.floor(Math.random() * availableIds.length)]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMobileViewport]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = phase === "hidden" ? originalOverflow : "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [phase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasMinimumDelayElapsed(true);
    }, initialLoadingDuration);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (document.readyState === "complete") {
      const timer = window.setTimeout(() => {
        setIsPageReady(true);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const handleLoad = () => {
      setIsPageReady(true);
    };

    window.addEventListener("load", handleLoad, { once: true });

    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  useEffect(() => {
    if (phase !== "loading" || animationId === null || !hasMinimumDelayElapsed || !isPageReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("revealing");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [phase, animationId, hasMinimumDelayElapsed, isPageReady]);

  useEffect(() => {
    if (phase !== "revealing" || animationId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("hidden");
    }, loadingRevealDurations[animationId]);

    return () => window.clearTimeout(timer);
  }, [phase, animationId]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-[#080a0d]">
      {animationId ? <LoadingScreenRenderer animationId={animationId} phase={phase} /> : null}
    </div>
  );
}
