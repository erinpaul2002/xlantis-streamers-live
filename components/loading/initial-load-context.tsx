"use client";

import { createContext, useContext } from "react";

type InitialLoadContextValue = {
  isInitialLoadSettled: boolean;
  settleInitialLoad: () => void;
};

export const InitialLoadContext = createContext<InitialLoadContextValue | null>(null);

export function useInitialLoadController() {
  const value = useContext(InitialLoadContext);

  if (!value) {
    throw new Error("useInitialLoadController must be used within InitialLoadProvider.");
  }

  return value;
}
