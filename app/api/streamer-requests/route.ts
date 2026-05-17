import { NextResponse } from "next/server";
import { createStreamerRequest, validateStreamerRequest } from "@/lib/streamer-requests";
import type { StreamerRequestResponse } from "@/types/streamer-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<StreamerRequestResponse>(
      {
        ok: false,
        message: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const validation = validateStreamerRequest(payload);

  if (!validation.ok) {
    return NextResponse.json<StreamerRequestResponse>(
      {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const streamerRequest = await createStreamerRequest(validation.value);

    return NextResponse.json<StreamerRequestResponse>(
      {
        ok: true,
        message: "Request received. Thanks for helping expand the list.",
        request: streamerRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create streamer request", error);

    const fieldErrors =
      error instanceof Error && "fieldErrors" in error
        ? ((error as Error & { fieldErrors?: StreamerRequestResponse["fieldErrors"] }).fieldErrors ?? undefined)
        : undefined;
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? ((error as Error & { statusCode?: number }).statusCode ?? 500)
        : 500;
    const message = error instanceof Error ? error.message : "The request could not be submitted right now.";

    if (fieldErrors) {
      return NextResponse.json<StreamerRequestResponse>(
        {
          ok: false,
          message,
          fieldErrors,
        },
        { status: statusCode },
      );
    }

    return NextResponse.json<StreamerRequestResponse>(
      {
        ok: false,
        message: "The request could not be submitted right now.",
      },
      { status: 500 },
    );
  }
}
