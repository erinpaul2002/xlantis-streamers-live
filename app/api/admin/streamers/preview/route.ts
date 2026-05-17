import { NextResponse } from "next/server";
import { ensureAdminRequest } from "@/lib/admin-route";
import { buildPreviewFromDraft } from "@/lib/admin-streamer-preview";
import { sanitizeStreamerInput } from "@/lib/admin-streamer-utils";
import type { AdminStreamerPreviewResponse } from "@/types/admin-streamer";
import type { Streamer } from "@/types/streamer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authFailure = await ensureAdminRequest();

  if (authFailure) {
    return authFailure;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<AdminStreamerPreviewResponse>(
      {
        ok: false,
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const draft = typeof payload === "object" && payload !== null ? (payload as { streamer?: Streamer }).streamer : undefined;

  if (!draft) {
    return NextResponse.json<AdminStreamerPreviewResponse>(
      {
        ok: false,
        message: "Streamer draft is required.",
      },
      { status: 400 },
    );
  }

  try {
    const preview = await buildPreviewFromDraft(sanitizeStreamerInput(draft));

    return NextResponse.json<AdminStreamerPreviewResponse>({
      ok: true,
      message: "Preview refreshed.",
      preview,
    });
  } catch (error) {
    console.error("Failed to preview streamer draft", error);

    return NextResponse.json<AdminStreamerPreviewResponse>(
      {
        ok: false,
        message: "Could not load the live preview right now.",
      },
      { status: 500 },
    );
  }
}
