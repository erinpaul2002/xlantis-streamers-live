import { Dashboard } from "@/components/dashboard";
import { getStatusResponse } from "@/lib/status-service";

export default async function Home() {
  const initialStatus = await getStatusResponse();

  return <Dashboard initialNow={new Date().toISOString()} initialStatus={initialStatus} />;
}
