"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LoadingScreenId } from "@/components/loading/loading-screen-ids";
import { LoadingScreenRenderer } from "@/components/loading/loading-screen-renderer";
import { loadingRevealDurations } from "@/components/loading/loading-screen-config";
import type { LoadingScreenPhase } from "@/components/loading/loading-screen-types";
import { useInitialLoadController } from "@/components/loading/initial-load-context";

const initialLoadingScreenId: LoadingScreenId = 1;
const minimumVisibleDurationMs = 450;

export function AppEntryLoader() {
  const { isInitialLoadSettled } = useInitialLoadController();
  const pathname = usePathname();
  const [animationId] = useState<LoadingScreenId>(initialLoadingScreenId);
  const [phase, setPhase] = useState<LoadingScreenPhase | "hidden">("loading");
  const [hasMinimumDelayElapsed, setHasMinimumDelayElapsed] = useState(false);
  const shouldWaitForInitialStatus = pathname === "/";

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
    }, minimumVisibleDurationMs);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "loading" || !hasMinimumDelayElapsed) {
      return;
    }

    if (shouldWaitForInitialStatus && !isInitialLoadSettled) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase("revealing");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [phase, hasMinimumDelayElapsed, isInitialLoadSettled, shouldWaitForInitialStatus]);

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
