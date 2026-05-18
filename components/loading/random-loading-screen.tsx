"use client";

import { useEffect, useState } from "react";
import { LoadingScreenRenderer } from "@/components/loading/loading-screen-renderer";
import type { LoadingScreenId } from "@/components/loading/loading-screen-ids";
import { getAvailableLoadingScreenIds } from "@/components/loading/loading-screen-ids";
import { useIsMobileLoadingViewport } from "@/components/loading/loading-screen-device";

export function RandomLoadingScreen() {
  const isMobileViewport = useIsMobileLoadingViewport();
  const [animationId, setAnimationId] = useState<LoadingScreenId | null>(null);

  useEffect(() => {
    const availableIds = getAvailableLoadingScreenIds(isMobileViewport);
    const timer = window.setTimeout(() => {
      setAnimationId(availableIds[Math.floor(Math.random() * availableIds.length)]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMobileViewport]);

  if (animationId === null) {
    return null;
  }

  return <LoadingScreenRenderer animationId={animationId} phase="loading" />;
}
