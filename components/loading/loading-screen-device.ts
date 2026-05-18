"use client";

import { useSyncExternalStore } from "react";

function isMobileLoadingViewport() {
  if (typeof window === "undefined") {
    return true;
  }

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(pointer: coarse)").matches ||
    /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const viewportQuery = window.matchMedia("(max-width: 767px)");
  const pointerQuery = window.matchMedia("(pointer: coarse)");

  viewportQuery.addEventListener("change", callback);
  pointerQuery.addEventListener("change", callback);
  window.addEventListener("resize", callback);

  return () => {
    viewportQuery.removeEventListener("change", callback);
    pointerQuery.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}

export function useIsMobileLoadingViewport() {
  return useSyncExternalStore(subscribe, isMobileLoadingViewport, () => true);
}
