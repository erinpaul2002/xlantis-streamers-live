import { NextResponse } from "next/server";
import { ensureAdminRequest } from "@/lib/admin-route";
import { deleteStreamerRequest } from "@/lib/streamer-requests";
import type { StreamerRequestDeleteResponse } from "@/types/streamer-request";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const authFailure = await ensureAdminRequest();

  if (authFailure) {
    return authFailure;
  }

  const { requestId } = await context.params;

  try {
    const deleted = await deleteStreamerRequest(requestId);

    return NextResponse.json<StreamerRequestDeleteResponse>({
      ok: true,
      message: "Request deleted.",
      request: deleted,
    });
  } catch (error) {
    console.error("Failed to delete streamer request", error);

    return NextResponse.json<StreamerRequestDeleteResponse>(
      {
        ok: false,
        message: "Could not delete that request right now.",
      },
      { status: 500 },
    );
  }
}
