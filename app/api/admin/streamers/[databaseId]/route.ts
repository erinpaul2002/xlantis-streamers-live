import { NextResponse } from "next/server";
import { ensureAdminRequest } from "@/lib/admin-route";
import { buildPreviewFromDraft } from "@/lib/admin-streamer-preview";
import { deleteAdminStreamer, getAdminStreamers, type AdminStreamer, updateAdminStreamer } from "@/lib/db/streamers";
import { validateAdminStreamerInput } from "@/lib/admin-streamer-utils";
import type { AdminStreamerDeleteResponse, AdminStreamerMutationResponse } from "@/types/admin-streamer";
import type { Streamer } from "@/types/streamer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    databaseId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const streamer =
    typeof payload === "object" && payload !== null ? (payload as { streamer?: Streamer }).streamer : undefined;

  if (!streamer) {
    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Streamer details are required.",
      },
      { status: 400 },
    );
  }

  const { databaseId } = await context.params;

  try {
    const existing = await getAdminStreamers();
    const validation = validateAdminStreamerInput(streamer, existing, {
      ignoreDatabaseId: databaseId,
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

    const saved = await updateAdminStreamer(databaseId, validation.value);
    const preview = await buildPreviewFromDraft(saved);

    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>({
      ok: true,
      message: "Streamer updated.",
      streamer: saved,
      preview,
    });
  } catch (error) {
    console.error("Failed to update streamer", error);

    return NextResponse.json<AdminStreamerMutationResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Could not save streamer changes right now.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authFailure = await ensureAdminRequest();

  if (authFailure) {
    return authFailure;
  }

  const { databaseId } = await context.params;

  try {
    const deleted = await deleteAdminStreamer(databaseId);

    return NextResponse.json<AdminStreamerDeleteResponse<AdminStreamer>>({
      ok: true,
      message: "Streamer deleted.",
      streamer: deleted,
    });
  } catch (error) {
    console.error("Failed to delete streamer", error);

    return NextResponse.json<AdminStreamerDeleteResponse<AdminStreamer>>(
      {
        ok: false,
        message: "Could not delete that streamer right now.",
      },
      { status: 500 },
    );
  }
}
