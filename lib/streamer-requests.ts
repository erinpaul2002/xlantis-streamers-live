import { api } from "@/convex/_generated/api";
import { normalizeYouTubeIdentity } from "@/lib/admin-streamer-utils";
import { requireConvexClient } from "@/lib/convex/client";
import { toAdminStreamer, type AdminStreamer } from "@/lib/db/streamers";
import { resolveRequestDraft } from "@/lib/request-account-resolution";
import type { StreamerRequest, StreamerRequestInput } from "@/types/streamer-request";
import type { Streamer } from "@/types/streamer";

type ValidationResult =
  | { ok: true; value: StreamerRequestInput }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof StreamerRequestInput, string>>;
    };

type SubmissionAccountState = "new" | "streamer" | "request";
type ResolvedQueueRequest = {
  request: {
    _id?: string;
    streamerName: string;
    kickUrl?: string;
    youtubeUrl?: string;
  };
  resolved: Awaited<ReturnType<typeof resolveRequestDraft>>;
};

const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const kickHosts = new Set(["kick.com", "www.kick.com"]);

function trimOptional(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getUrlHost(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function validateKickUrl(accountUrl: string) {
  const host = getUrlHost(accountUrl);

  if (!host) {
    return "Enter a valid Kick URL.";
  }

  if (!kickHosts.has(host)) {
    return "Use a Kick profile URL.";
  }

  return null;
}

function validateYoutubeUrl(accountUrl: string) {
  const host = getUrlHost(accountUrl);

  if (!host) {
    return "Enter a valid YouTube URL.";
  }

  if (!youtubeHosts.has(host)) {
    return "Use a YouTube channel, handle, or video URL.";
  }

  return null;
}

export function validateStreamerRequest(payload: unknown): ValidationResult {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const streamerName = trimOptional(record.streamerName);
  const kickUrl = trimOptional(record.kickUrl);
  const youtubeUrl = trimOptional(record.youtubeUrl);
  const fieldErrors: Partial<Record<keyof StreamerRequestInput, string>> = {};

  if (streamerName.length < 2) {
    fieldErrors.streamerName = "Enter the streamer's name.";
  }

  if (!kickUrl && !youtubeUrl) {
    fieldErrors.kickUrl = "Add a Kick URL or a YouTube URL.";
    fieldErrors.youtubeUrl = "Add a Kick URL or a YouTube URL.";
  }

  if (kickUrl) {
    const urlError = validateKickUrl(kickUrl);

    if (urlError) {
      fieldErrors.kickUrl = urlError;
    }
  }

  if (youtubeUrl) {
    const urlError = validateYoutubeUrl(youtubeUrl);

    if (urlError) {
      fieldErrors.youtubeUrl = urlError;
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      streamerName,
      kickUrl: kickUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
    },
  };
}

export async function createStreamerRequest(input: StreamerRequestInput): Promise<StreamerRequest> {
  const client = requireConvexClient();
  const duplicateCheck = await validateStreamerRequestSubmission(input);

  if (!duplicateCheck.ok) {
    throw Object.assign(new Error(duplicateCheck.message), {
      fieldErrors: duplicateCheck.fieldErrors,
      statusCode: 409,
    });
  }

  const request = await client.mutation(api.streamerRequests.create, input);

  if (!request) {
    throw new Error("Convex did not return the created streamer request.");
  }

  const streamerRequest = toStreamerRequest(request);

  await notifyStreamerRequest(streamerRequest);

  return streamerRequest;
}

export async function listStreamerRequests(): Promise<StreamerRequest[]> {
  const client = requireConvexClient();
  const requests = await client.query(api.streamerRequests.list, {});

  return requests.map(toStreamerRequest);
}

async function validateStreamerRequestSubmission(input: StreamerRequestInput) {
  const client = requireConvexClient();
  const [streamers, requests, resolved] = await Promise.all([
    client.query(api.streamers.list, {}),
    client.query(api.streamerRequests.list, {}),
    resolveRequestDraft(input),
  ]);
  const resolvedExistingRequests = await Promise.all(
    requests.map(async (request) => ({
      request,
      resolved: await resolveRequestDraft({
        streamerName: request.streamerName,
        kickUrl: request.kickUrl,
        youtubeUrl: request.youtubeUrl,
      }),
    })),
  );
  const fieldErrors: Partial<Record<keyof StreamerRequestInput, string>> = {};
  const resolvedYouTubeIdentity = normalizeYouTubeIdentity(resolved.resolvedYouTube);
  const accountStates: SubmissionAccountState[] = [];

  if (resolved.resolvedKick?.slug) {
    const duplicateStreamerKick = streamers.find((streamer) => streamer.kick?.slug?.toLowerCase() === resolved.resolvedKick?.slug);
    const duplicateRequestKick = resolvedExistingRequests.find(
      ({ resolved: existing }) => existing.resolvedKick?.slug === resolved.resolvedKick?.slug,
    );

    if (duplicateStreamerKick) {
      accountStates.push("streamer");
      fieldErrors.kickUrl = "That Kick account is already added.";
    } else if (duplicateRequestKick) {
      accountStates.push("request");
      fieldErrors.kickUrl = "That Kick account is already in the request queue.";
    } else {
      accountStates.push("new");
    }
  }

  if (resolvedYouTubeIdentity.channelId || resolvedYouTubeIdentity.handle || resolvedYouTubeIdentity.profileUrl) {
    const duplicateStreamerYouTube = streamers.find((streamer) => {
      const candidate = normalizeYouTubeIdentity(streamer.youtube);

      return Boolean(
        (resolvedYouTubeIdentity.channelId && candidate.channelId === resolvedYouTubeIdentity.channelId) ||
          (resolvedYouTubeIdentity.handle && candidate.handle === resolvedYouTubeIdentity.handle) ||
          (resolvedYouTubeIdentity.profileUrl && candidate.profileUrl === resolvedYouTubeIdentity.profileUrl),
      );
    });
    const duplicateRequestYouTube = resolvedExistingRequests.find(({ resolved: existing }) => {
      const requestIdentity = normalizeYouTubeIdentity(existing.resolvedYouTube);

      return Boolean(
        (resolvedYouTubeIdentity.channelId && requestIdentity.channelId === resolvedYouTubeIdentity.channelId) ||
          (resolvedYouTubeIdentity.handle && requestIdentity.handle === resolvedYouTubeIdentity.handle) ||
          (resolvedYouTubeIdentity.profileUrl && requestIdentity.profileUrl === resolvedYouTubeIdentity.profileUrl),
      );
    });

    if (duplicateStreamerYouTube) {
      accountStates.push("streamer");
      fieldErrors.youtubeUrl = "That YouTube account is already added.";
    } else if (duplicateRequestYouTube) {
      accountStates.push("request");
      fieldErrors.youtubeUrl = "That YouTube account is already in the request queue.";
    } else {
      accountStates.push("new");
    }
  }

  if (accountStates.length > 0 && accountStates.every((state) => state !== "new")) {
    return {
      ok: false as const,
      message: "Every submitted account is already added or already waiting in requests.",
      fieldErrors,
    };
  }

  return {
    ok: true as const,
  };
}

async function resolveQueuedRequests() {
  const client = requireConvexClient();
  const requests = await client.query(api.streamerRequests.list, {});

  return Promise.all(
    requests.map(async (request) => ({
      request,
      resolved: await resolveRequestDraft({
        streamerName: request.streamerName,
        kickUrl: request.kickUrl,
        youtubeUrl: request.youtubeUrl,
      }),
    })),
  ) satisfies Promise<ResolvedQueueRequest[]>;
}

function requestMatchesStreamerRequest(
  candidate: ResolvedQueueRequest,
  streamerKickSlug: string | undefined,
  streamerYouTube: ReturnType<typeof normalizeYouTubeIdentity>,
) {
  const candidateYouTube = normalizeYouTubeIdentity(candidate.resolved.resolvedYouTube);

  return Boolean(
    (streamerKickSlug && candidate.resolved.resolvedKick?.slug === streamerKickSlug) ||
      (streamerYouTube.channelId && candidateYouTube.channelId === streamerYouTube.channelId) ||
      (streamerYouTube.handle && candidateYouTube.handle === streamerYouTube.handle) ||
      (streamerYouTube.profileUrl && candidateYouTube.profileUrl === streamerYouTube.profileUrl),
  );
}

async function findRelatedStreamerRequestIds(requestId: string, streamer: Streamer, helperRequestIds?: string[]) {
  const resolvedRequests = await resolveQueuedRequests();
  const streamerKickSlug = streamer.kick?.slug?.toLowerCase();
  const streamerYouTube = normalizeYouTubeIdentity(streamer.youtube);

  return resolvedRequests
    .filter((candidate) => {
      if (!candidate.request._id) {
        return false;
      }

      if (requestMatchesStreamerRequest(candidate, streamerKickSlug, streamerYouTube)) {
        return true;
      }

      return Boolean(helperRequestIds?.includes(candidate.request._id) && requestMatchesStreamerRequest(candidate, streamerKickSlug, streamerYouTube));
    })
    .map((candidate) => candidate.request._id as string);
}

function uniqRequestIds(requestIds: Array<string | undefined>) {
  return Array.from(new Set(requestIds.filter((value): value is string => Boolean(value))));
}

export async function deleteStreamerRequest(requestId: string): Promise<StreamerRequest> {
  const client = requireConvexClient();
  const requests = await client.query(api.streamerRequests.list, {});
  const request = requests.find((item) => item._id === requestId);

  if (!request) {
    throw new Error("Streamer request not found.");
  }

  await client.mutation(api.streamerRequests.deleteById, {
    requestId,
  });

  return toStreamerRequest(request);
}

export async function approveStreamerRequest(
  requestId: string,
  streamer: Streamer,
  targetDatabaseId?: string,
  selectedHelperRequestIds?: string[],
): Promise<{ streamer: AdminStreamer; deletedRequestCount: number; deletedRequestIds: string[] }> {
  const client = requireConvexClient();
  const relatedRequestIds = uniqRequestIds(await findRelatedStreamerRequestIds(requestId, streamer, selectedHelperRequestIds));
  const result = await client.mutation(api.streamerRequests.approveAndDelete, {
    requestId,
    relatedRequestIds,
    streamer,
    targetDatabaseId,
  });

  if (!result?.streamer) {
    throw new Error("Convex did not return the approved streamer.");
  }

  return {
    deletedRequestIds: result.deletedRequestIds ?? [],
    deletedRequestCount: result.deletedRequestIds?.length ?? 0,
    streamer: toAdminStreamer(result.streamer),
  };
}

function toStreamerRequest(request: {
  _id?: string;
  streamerName: string;
  kickUrl?: string;
  youtubeUrl?: string;
  status?: StreamerRequest["status"];
  createdAt: number;
}): StreamerRequest {
  return {
    id: request._id ?? crypto.randomUUID(),
    databaseId: request._id,
    streamerName: request.streamerName,
    kickUrl: request.kickUrl,
    youtubeUrl: request.youtubeUrl,
    status: request.status,
    createdAt: new Date(request.createdAt).toISOString(),
  };
}

async function notifyStreamerRequest(request: StreamerRequest) {
  try {
    await deliverStreamerRequest(request);
  } catch (error) {
    console.error("Streamer request notification failed", error);
  }
}

async function deliverStreamerRequest(request: StreamerRequest) {
  const webhookUrl = process.env.STREAMER_REQUEST_WEBHOOK_URL;

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Streamer request webhook returned ${response.status}`);
    }

    return;
  }
}
