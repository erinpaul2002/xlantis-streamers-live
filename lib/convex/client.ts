import { ConvexHttpClient } from "convex/browser";

let client: ConvexHttpClient | null = null;

export function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    return null;
  }

  client ??= new ConvexHttpClient(convexUrl);

  return client;
}

export function requireConvexClient() {
  const convexClient = getConvexClient();

  if (!convexClient) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required to read and write Convex data.");
  }

  return convexClient;
}
