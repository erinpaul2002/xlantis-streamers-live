"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import { LoadingScreenRenderer } from "@/components/loading/loading-screen-renderer";
import {
  getAvailableLoadingScreenIds,
  getResolvedLoadingScreenId,
  type LoadingScreenId,
} from "@/components/loading/loading-screen-ids";
import { useIsMobileLoadingViewport } from "@/components/loading/loading-screen-device";

export default function LoadingScreensShowcase() {
  const isMobileViewport = useIsMobileLoadingViewport();
  const [active, setActive] = useState<LoadingScreenId>(1);
  const [runId, setRunId] = useState(0);
  const animationOptions = getAvailableLoadingScreenIds(isMobileViewport);
  const resolvedActive = getResolvedLoadingScreenId(active, isMobileViewport);

  function startAnimation(num = active) {
    setActive(num);
    setRunId((current) => current + 1);
  }
  const activeAnimationKey = `${resolvedActive}-${runId}`;

  return (
    <MotionConfig reducedMotion="never">
      <div className="relative flex h-[100svh] min-h-[100svh] flex-col overflow-hidden bg-[#080a0d] text-white">
        <nav className="fixed left-0 top-0 z-[1000] flex w-full flex-col items-center gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div
            className="flex max-w-full flex-wrap justify-center gap-2 rounded-full border border-[#333] bg-[#111]/92 px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {animationOptions.map((num) => (
              <button
                key={num}
                type="button"
                aria-pressed={active === num}
                onClick={() => startAnimation(num)}
                className={`flex h-10 w-10 touch-manipulation items-center justify-center rounded-full font-mono text-sm transition-all duration-300 sm:h-10 sm:w-10 ${
                  active === num
                    ? "scale-110 bg-white font-bold text-black"
                    : "bg-transparent text-neutral-400 hover:bg-[#222] hover:text-white"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </nav>

        <div className="pointer-events-none absolute inset-0 z-[100]">
          <LoadingScreenRenderer key={activeAnimationKey} animationId={resolvedActive} phase="loading" />
        </div>
      </div>
    </MotionConfig>
  );
}
