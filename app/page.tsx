import { Dashboard } from "@/components/dashboard";
import { getStatusResponse } from "@/lib/status-service";
import type { StatusResponse } from "@/types/status";

export const dynamic = "force-dynamic";

function createEmptyStatusResponse(): StatusResponse {
  return {
    live: [],
    offline: [],
    lastUpdatedAt: "",
  };
}

export default async function Home() {
  const initialNow = new Date().toISOString();
  let initialStatus = createEmptyStatusResponse();

  try {
    initialStatus = await getStatusResponse();
  } catch (error) {
    console.error("Failed to load initial stream status for the home page.", error);
  }

  return <Dashboard initialNow={initialNow} initialStatus={initialStatus} />;
}
