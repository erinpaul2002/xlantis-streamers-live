import { NextResponse } from "next/server";
import { ensureAdminRequest } from "@/lib/admin-route";
import { buildPreviewFromDraft } from "@/lib/admin-streamer-preview";
import { getAdminStreamers, type AdminStreamer } from "@/lib/db/streamers";
import { validateAdminStreamerInput } from "@/lib/admin-streamer-utils";
import { approveStreamerRequest } from "@/lib/streamer-requests";
import type { AdminStreamerMutationResponse } from "@/types/admin-streamer";
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
    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const requestId =
    typeof payload === "object" && payload !== null ? (payload as { requestId?: string }).requestId : undefined;
  const streamer =
    typeof payload === "object" && payload !== null ? (payload as { streamer?: Streamer }).streamer : undefined;
  const targetDatabaseId =
    typeof payload === "object" && payload !== null ? (payload as { targetDatabaseId?: string }).targetDatabaseId : undefined;
  const selectedHelperRequestIds =
    typeof payload === "object" && payload !== null
      ? (payload as { selectedHelperRequestIds?: string[] }).selectedHelperRequestIds
      : undefined;

  if (!requestId || !streamer) {
    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Request ID and streamer details are required.",
      },
      { status: 400 },
    );
  }

  try {
    const existing = await getAdminStreamers();
    const validation = validateAdminStreamerInput(streamer, existing, {
      ignoreDatabaseId: targetDatabaseId,
    });

    if (!validation.ok) {
      const preview = await buildPreviewFromDraft(validation.value);

      return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
        {
          ok: false,
          message: "Please fix the highlighted fields.",
          fieldErrors: validation.fieldErrors,
          preview,
        },
        { status: 400 },
      );
    }

    const approval = await approveStreamerRequest(requestId, validation.value, targetDatabaseId, selectedHelperRequestIds);
    const preview = await buildPreviewFromDraft(approval.streamer);
    const removedRelatedRequests = approval.deletedRequestCount > 1;

    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>({
      ok: true,
      message: targetDatabaseId
        ? removedRelatedRequests
          ? "Streamer merged and related requests removed."
          : "Streamer merged and request removed."
        : removedRelatedRequests
          ? "Streamer added and related requests removed."
          : "Streamer added and request removed.",
      deletedRequestIds: approval.deletedRequestIds,
      streamer: approval.streamer,
      preview,
    });
  } catch (error) {
    console.error("Failed to approve streamer request", error);

    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Could not approve that request right now.",
      },
      { status: 500 },
    );
  }
}
