import { NextResponse } from "next/server";
import { ensureAdminRequest } from "@/lib/admin-route";
import { buildPreviewFromRequest } from "@/lib/admin-streamer-preview";
import { getAdminStreamers } from "@/lib/db/streamers";
import { validateAdminStreamerInput } from "@/lib/admin-streamer-utils";
import { validateStreamerRequest } from "@/lib/streamer-requests";
import type { AdminStreamerPreviewResponse } from "@/types/admin-streamer";
import type { StreamerRequestPreviewInput } from "@/types/streamer-request";

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

  const validation = validateStreamerRequest(payload);

  if (!validation.ok) {
    return NextResponse.json<AdminStreamerPreviewResponse>(
      {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  const targetDatabaseId =
    typeof payload === "object" && payload !== null
      ? (payload as { targetDatabaseId?: StreamerRequestPreviewInput["targetDatabaseId"] }).targetDatabaseId
      : undefined;
  const requestId =
    typeof payload === "object" && payload !== null
      ? (payload as { requestId?: StreamerRequestPreviewInput["requestId"] }).requestId
      : undefined;
  const selectedHelperRequestIds =
    typeof payload === "object" && payload !== null
      ? (payload as { selectedHelperRequestIds?: StreamerRequestPreviewInput["selectedHelperRequestIds"] })
          .selectedHelperRequestIds
      : undefined;

  try {
    const existing = await getAdminStreamers();
    const preview = await buildPreviewFromRequest(
      {
        ...validation.value,
        requestId,
        selectedHelperRequestIds,
        targetDatabaseId,
      },
      existing,
    );
    const streamerValidation = validateAdminStreamerInput(preview.draft, existing, {
      ignoreDatabaseId: preview.selectedTargetDatabaseId,
    });

    return NextResponse.json<AdminStreamerPreviewResponse>({
      ok: true,
      message: "Preview loaded.",
      preview: {
        ...preview,
        fieldErrors: streamerValidation.ok ? undefined : streamerValidation.fieldErrors,
      },
    });
  } catch (error) {
    console.error("Failed to preview streamer request", error);

    return NextResponse.json<AdminStreamerPreviewResponse>(
      {
        ok: false,
        message: "Could not process those links right now.",
      },
      { status: 500 },
    );
  }
}
