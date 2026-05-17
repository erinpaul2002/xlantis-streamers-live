import { NextResponse } from "next/server";
import { getStatusResponse } from "@/lib/status-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await getStatusResponse();

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
