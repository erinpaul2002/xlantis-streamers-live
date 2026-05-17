import { NextResponse } from "next/server";
import { getStreamers } from "@/lib/db/streamers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    streamers: await getStreamers(),
  });
}
