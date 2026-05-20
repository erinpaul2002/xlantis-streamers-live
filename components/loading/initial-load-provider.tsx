"use client";

import { useState } from "react";
import { AppEntryLoader } from "@/components/loading/app-entry-loader";
import { InitialLoadContext } from "@/components/loading/initial-load-context";

export function InitialLoadProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isInitialLoadSettled, setIsInitialLoadSettled] = useState(false);

  return (
    <InitialLoadContext.Provider
      value={{
        isInitialLoadSettled,
        settleInitialLoad: () => setIsInitialLoadSettled(true),
      }}
    >
      <AppEntryLoader />
      {children}
    </InitialLoadContext.Provider>
  );
}
