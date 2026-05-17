import { Dashboard } from "@/components/dashboard";
import { createEmptyStatusResponse, getStatusResponse } from "@/lib/status-service";

export const dynamic = "force-dynamic";

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
