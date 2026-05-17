import { NextResponse } from "next/server";
import { createEmptyStatusResponse, getStatusResponse } from "@/lib/status-service";

export const dynamic = "force-dynamic";

export async function GET() {
  let response = createEmptyStatusResponse();

  try {
    response = await getStatusResponse();
  } catch (error) {
    console.error("Failed to load stream status for /api/status.", error);
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
