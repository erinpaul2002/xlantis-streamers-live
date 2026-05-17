import type { StreamStatus } from "./status";
import type { Platform, Streamer, StreamerGroup } from "./streamer";

export type AdminFieldErrors = Partial<Record<string, string>>;

export type AdminStreamerMatchCandidate = {
  databaseId?: string;
  id: string;
  displayName: string;
  group: StreamerGroup;
  platforms: Platform[];
  score: number;
  reason: string;
};

export type PendingRequestCandidate = {
  requestId: string;
  streamerName: string;
  kickUrl?: string;
  youtubeUrl?: string;
  platforms: Platform[];
  score: number;
  reason: string;
};

export type AdminPlatformPreview = {
  state: "missing" | "resolved" | "error";
  submittedUrl?: string;
  canonicalUrl?: string;
  message?: string;
  status?: StreamStatus;
};

export type AdminStreamerPreview = {
  draft: Streamer;
  fieldErrors?: AdminFieldErrors;
  matchCandidates?: AdminStreamerMatchCandidate[];
  pendingRequestCandidates?: PendingRequestCandidate[];
  appliedHelperRequestIds?: string[];
  appliedHelperRequestsNote?: string;
  selectedTargetDatabaseId?: string;
  mergeWarning?: string;
  relatedRequestsNote?: string;
  platforms: {
    kick: AdminPlatformPreview;
    youtube: AdminPlatformPreview;
  };
};

export type AdminStreamerPreviewResponse = {
  ok: boolean;
  message: string;
  preview?: AdminStreamerPreview;
  fieldErrors?: AdminFieldErrors;
};

export type AdminStreamerMutationResponse<TStreamer> = {
  ok: boolean;
  message: string;
  streamer?: TStreamer;
  deletedRequestIds?: string[];
  fieldErrors?: AdminFieldErrors;
  preview?: AdminStreamerPreview;
};

export type AdminStreamerDeleteResponse<TStreamer> = {
  ok: boolean;
  message: string;
  streamer?: TStreamer;
};
