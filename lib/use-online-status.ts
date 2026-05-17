"use client";

import { useEffect, useState } from "react";

function readOnlineStatus() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const syncOnlineStatus = () => {
      setIsOnline(readOnlineStatus());
    };

    syncOnlineStatus();
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);

    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  return isOnline;
}
