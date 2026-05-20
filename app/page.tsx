import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  const initialNow = new Date().toISOString();

  return <Dashboard initialNow={initialNow} />;
}
