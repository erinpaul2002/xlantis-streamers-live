"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getAvailableLoadingScreenIds,
  type LoadingScreenId,
} from "@/components/loading/loading-screen-ids";
import { useIsMobileLoadingViewport } from "@/components/loading/loading-screen-device";
import { LoadingScreenRenderer } from "@/components/loading/loading-screen-renderer";
import { loadingMinimumDurations, loadingRevealDurations } from "@/components/loading/loading-screen-config";
import type { LoadingScreenPhase } from "@/components/loading/loading-screen-types";
import { useInitialLoadController } from "@/components/loading/initial-load-context";

const fallbackLoadingScreenId: LoadingScreenId = 1;

export function AppEntryLoader() {
  const { isInitialLoadSettled } = useInitialLoadController();
  const pathname = usePathname();
  const isMobileViewport = useIsMobileLoadingViewport();
  const [animationId, setAnimationId] = useState<LoadingScreenId>(fallbackLoadingScreenId);
  const [phase, setPhase] = useState<LoadingScreenPhase | "hidden">("loading");
  const [minimumDurationReadyAnimationId, setMinimumDurationReadyAnimationId] = useState<LoadingScreenId | null>(null);
  const shouldWaitForInitialStatus = pathname === "/";
  const hasMinimumDurationElapsed = minimumDurationReadyAnimationId === animationId;

  useEffect(() => {
    const availableIds = getAvailableLoadingScreenIds(isMobileViewport);
    const timer = window.setTimeout(() => {
      setAnimationId(availableIds[Math.floor(Math.random() * availableIds.length)] ?? fallbackLoadingScreenId);
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
      setMinimumDurationReadyAnimationId(animationId);
    }, loadingMinimumDurations[animationId]);

    return () => window.clearTimeout(timer);
  }, [animationId]);

  useEffect(() => {
    if (phase !== "loading" || !hasMinimumDurationElapsed) {
      return;
    }

    if (shouldWaitForInitialStatus && !isInitialLoadSettled) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("revealing");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [phase, hasMinimumDurationElapsed, isInitialLoadSettled, shouldWaitForInitialStatus]);

  useEffect(() => {
    if (phase !== "revealing") {
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
      <LoadingScreenRenderer animationId={animationId} phase={phase} />
    </div>
  );
}
