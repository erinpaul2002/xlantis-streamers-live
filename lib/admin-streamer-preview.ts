import "server-only";

import { fetchKickStatus } from "@/lib/platforms/kick";
import { fetchYouTubeStatus } from "@/lib/platforms/youtube";
import { buildDefaultStreamerId, isSameYouTubeAccount, sanitizeStreamerInput } from "@/lib/admin-streamer-utils";
import type { AdminStreamer } from "@/lib/db/streamers";
import type { ResolvedRequestDraft } from "@/lib/request-account-resolution";
import { listStreamerRequests } from "@/lib/streamer-requests";
import type {
  AdminPlatformPreview,
  AdminStreamerMatchCandidate,
  AdminStreamerPreview,
  PendingRequestCandidate,
} from "@/types/admin-streamer";
import type { StreamStatus } from "@/types/status";
import type { Platform, PlatformStreamer, Streamer } from "@/types/streamer";
import type { StreamerRequest, StreamerRequestPreviewInput } from "@/types/streamer-request";
import { resolveRequestDraft } from "@/lib/request-account-resolution";
import {
  canonicalKickProfileUrl,
} from "@/lib/admin-streamer-utils";

function isGeneratedAsset(value: string | undefined) {
  return Boolean(value?.startsWith("data:image/svg+xml"));
}

function buildPreviewPlatformStreamer(streamer: Streamer, platform: "kick" | "youtube"): PlatformStreamer {
  return {
    id: `${streamer.id}:preview:${platform}`,
    streamerId: streamer.id,
    displayName: streamer.displayName,
    platform,
    group: streamer.group,
    isActive: streamer.isActive,
    kickSlug: streamer.kick?.slug,
    youtubeChannelId: streamer.youtube?.channelId,
    youtubeHandle: streamer.youtube?.handle,
    avatarUrl: platform === "kick" ? streamer.kick?.avatarUrl : streamer.youtube?.avatarUrl,
    fallbackThumbnailUrl:
      platform === "kick" ? streamer.kick?.fallbackThumbnailUrl : streamer.youtube?.fallbackThumbnailUrl,
    profileUrl: platform === "kick" ? streamer.kick?.profileUrl : streamer.youtube?.profileUrl,
  };
}

function applyResolvedArt(streamer: Streamer, platform: "kick" | "youtube", status: StreamStatus | undefined) {
  if (!status) {
    return streamer;
  }

  if (platform === "kick" && streamer.kick) {
    streamer.kick = {
      ...streamer.kick,
      avatarUrl: !isGeneratedAsset(status.avatarUrl) ? status.avatarUrl : streamer.kick.avatarUrl,
      fallbackThumbnailUrl: !isGeneratedAsset(status.thumbnailUrl) ? status.thumbnailUrl : streamer.kick.fallbackThumbnailUrl,
      profileUrl: status.profileUrl ?? streamer.kick.profileUrl,
    };
  }

  if (platform === "youtube" && streamer.youtube) {
    streamer.youtube = {
      ...streamer.youtube,
      avatarUrl: !isGeneratedAsset(status.avatarUrl) ? status.avatarUrl : streamer.youtube.avatarUrl,
      fallbackThumbnailUrl: !isGeneratedAsset(status.thumbnailUrl)
        ? status.thumbnailUrl
        : streamer.youtube.fallbackThumbnailUrl,
      profileUrl: status.profileUrl ?? streamer.youtube.profileUrl,
    };
  }
}

function normalizeNameParts(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactNormalizedName(value: string) {
  return normalizeNameParts(value).replace(/\s+/g, "");
}

function tokenizeName(value: string) {
  return normalizeNameParts(value).split(/\s+/).filter(Boolean);
}

function describeStreamerPlatforms(streamer: Pick<Streamer, "kick" | "youtube">): Platform[] {
  const platforms: Platform[] = [];

  if (streamer.kick?.slug) {
    platforms.push("kick");
  }

  if (streamer.youtube?.channelId || streamer.youtube?.handle || streamer.youtube?.profileUrl) {
    platforms.push("youtube");
  }

  return platforms;
}

type IdentityKey = {
  compact: string;
  source: string;
  tokens: string[];
};

type IdentityMatch = {
  score: number;
  reason: string;
};

function onlyKick(streamer: Pick<Streamer, "kick" | "youtube">) {
  return Boolean(streamer.kick?.slug && !streamer.youtube?.channelId && !streamer.youtube?.handle && !streamer.youtube?.profileUrl);
}

function onlyYouTube(streamer: Pick<Streamer, "kick" | "youtube">) {
  return Boolean((streamer.youtube?.channelId || streamer.youtube?.handle || streamer.youtube?.profileUrl) && !streamer.kick?.slug);
}

function hasKick(streamer: Pick<Streamer, "kick" | "youtube">) {
  return Boolean(streamer.kick?.slug);
}

function hasYouTube(streamer: Pick<Streamer, "kick" | "youtube">) {
  return Boolean(streamer.youtube?.channelId || streamer.youtube?.handle || streamer.youtube?.profileUrl);
}

function sharedPrefixLength(left: string, right: string) {
  const max = Math.min(left.length, right.length);
  let index = 0;

  while (index < max && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function parseProfileTail(profileUrl: string | undefined) {
  if (!profileUrl) {
    return undefined;
  }

  try {
    const url = new URL(profileUrl);
    const segments = url.pathname.split("/").filter(Boolean);

    if (!segments.length) {
      return undefined;
    }

    if (segments[0] === "channel" && segments[1]) {
      return segments[1];
    }

    return segments[segments.length - 1];
  } catch {
    return undefined;
  }
}

function buildIdentityKey(value: string | undefined, source: string) {
  const compact = compactNormalizedName(value ?? "");

  if (compact.length < 4) {
    return undefined;
  }

  return {
    compact,
    source,
    tokens: tokenizeName(value ?? "").filter((token) => token.length >= 4),
  } satisfies IdentityKey;
}

function collectIdentityKeysForPlatform(
  platform: "kick" | "youtube",
  account: Pick<Streamer, "kick" | "youtube">,
  displayName?: string,
) {
  const keys: IdentityKey[] = [];
  const seen = new Set<string>();

  function push(value: string | undefined, source: string) {
    const key = buildIdentityKey(value, source);

    if (!key || seen.has(key.compact)) {
      return;
    }

    seen.add(key.compact);
    keys.push(key);
  }

  if (platform === "kick") {
    push(account.kick?.slug, "Kick slug");
    push(parseProfileTail(account.kick?.profileUrl), "Kick profile");
  } else {
    push(account.youtube?.handle, "YouTube handle");
    push(parseProfileTail(account.youtube?.profileUrl), "YouTube profile");
  }

  push(displayName, platform === "kick" ? "Kick display name" : "YouTube display name");

  return keys;
}

function scoreIdentityMatch(leftKeys: IdentityKey[], rightKeys: IdentityKey[]) {
  let best: IdentityMatch | null = null;

  for (const left of leftKeys) {
    for (const right of rightKeys) {
      const overlapCount = left.tokens.filter((token) => right.tokens.includes(token)).length;
      const shorterLength = Math.min(left.compact.length, right.compact.length);
      const containsMatch =
        shorterLength >= 6 && (left.compact.includes(right.compact) || right.compact.includes(left.compact));
      const prefixLength = sharedPrefixLength(left.compact, right.compact);
      let candidate: IdentityMatch | null = null;

      if (left.compact === right.compact) {
        candidate = {
          score: 92,
          reason: `${left.source} and ${right.source} normalize to the same value.`,
        };
      } else if (containsMatch) {
        candidate = {
          score: 76,
          reason: `${left.source} looks like a longer variant of ${right.source}.`,
        };
      } else if (overlapCount > 0) {
        const ratio = overlapCount / Math.max(left.tokens.length, right.tokens.length, 1);

        if (ratio >= 0.5) {
          candidate = {
            score: 64,
            reason: `${left.source} and ${right.source} share distinctive name tokens.`,
          };
        }
      } else if (shorterLength >= 6 && prefixLength >= Math.min(6, shorterLength)) {
        candidate = {
          score: 58,
          reason: `${left.source} and ${right.source} share the same core characters.`,
        };
      }

      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }
    }
  }

  return best;
}

function currentSuggestionSourceKeys(resolved: ResolvedRequestDraft, preview: AdminStreamerPreview) {
  if (hasKick(resolved.draft) && !hasYouTube(resolved.draft)) {
    return collectIdentityKeysForPlatform("kick", resolved.draft, preview.platforms.kick.status?.displayName);
  }

  if (hasYouTube(resolved.draft) && !hasKick(resolved.draft)) {
    return collectIdentityKeysForPlatform("youtube", resolved.draft, preview.platforms.youtube.status?.displayName);
  }

  return [];
}

function buildMatchReason(identityMatch: IdentityMatch | null, exactKickMatch: boolean, exactYouTubeMatch: boolean) {
  if (exactKickMatch) {
    return "Exact Kick account match.";
  }

  if (exactYouTubeMatch) {
    return "Exact YouTube account match.";
  }

  if (identityMatch) {
    return identityMatch.reason;
  }

  return "Likely related account identity.";
}

function scoreMatchCandidate(
  resolved: Awaited<ReturnType<typeof resolveRequestDraft>>,
  preview: AdminStreamerPreview,
  streamer: AdminStreamer,
): AdminStreamerMatchCandidate | null {
  const exactKickMatch = Boolean(resolved.resolvedKick?.slug && streamer.kick?.slug && resolved.resolvedKick.slug === streamer.kick.slug);
  const exactYouTubeMatch = Boolean(resolved.resolvedYouTube && isSameYouTubeAccount(resolved.resolvedYouTube, streamer.youtube));
  const currentKeys = currentSuggestionSourceKeys(resolved, preview);
  const complementaryIdentityMatch =
    currentKeys.length > 0 && onlyKick(resolved.draft) && onlyYouTube(streamer)
      ? scoreIdentityMatch(currentKeys, collectIdentityKeysForPlatform("youtube", streamer, streamer.displayName))
      : currentKeys.length > 0 && onlyYouTube(resolved.draft) && onlyKick(streamer)
        ? scoreIdentityMatch(currentKeys, collectIdentityKeysForPlatform("kick", streamer, streamer.displayName))
        : null;

  let score = 0;

  if (exactKickMatch) {
    score += 150;
  }

  if (exactYouTubeMatch) {
    score += 150;
  }

  if (complementaryIdentityMatch) {
    score += complementaryIdentityMatch.score + 12;
  }

  if (!exactKickMatch && !exactYouTubeMatch && !complementaryIdentityMatch) {
    return null;
  }

  if (score < 60) {
    return null;
  }

  return {
    databaseId: streamer.databaseId,
    id: streamer.id,
    displayName: streamer.displayName,
    group: streamer.group,
    platforms: describeStreamerPlatforms(streamer),
    score,
    reason: buildMatchReason(complementaryIdentityMatch, exactKickMatch, exactYouTubeMatch),
  };
}

function buildMatchCandidates(
  resolved: Awaited<ReturnType<typeof resolveRequestDraft>>,
  preview: AdminStreamerPreview,
  existingStreamers: AdminStreamer[],
) {
  return existingStreamers
    .map((streamer) => scoreMatchCandidate(resolved, preview, streamer))
    .filter((candidate): candidate is AdminStreamerMatchCandidate => Boolean(candidate?.databaseId))
    .sort((a, b) => (b.score - a.score) || a.displayName.localeCompare(b.displayName))
    .slice(0, 5);
}

function cloneStreamer(streamer: Streamer): Streamer {
  return {
    ...streamer,
    kick: streamer.kick ? { ...streamer.kick } : undefined,
    youtube: streamer.youtube ? { ...streamer.youtube } : undefined,
  };
}

function preferredResolvedDisplayName(preview: AdminStreamerPreview) {
  return (
    preview.platforms.youtube.status?.displayName?.trim() ||
    preview.platforms.kick.status?.displayName?.trim() ||
    undefined
  );
}

function applyResolvedDisplayName(preview: AdminStreamerPreview) {
  const displayName = preferredResolvedDisplayName(preview);

  if (!displayName) {
    return preview;
  }

  preview.draft.displayName = displayName;
  preview.draft.id = buildDefaultStreamerId(displayName, preview.draft.group);

  return preview;
}

function cloneResolvedRequestDraft(resolved: ResolvedRequestDraft): ResolvedRequestDraft {
  return {
    draft: cloneStreamer(resolved.draft),
    resolvedKick: resolved.resolvedKick ? { ...resolved.resolvedKick } : undefined,
    resolvedYouTube: resolved.resolvedYouTube ? { ...resolved.resolvedYouTube } : undefined,
    kickError: resolved.kickError,
    youtubeError: resolved.youtubeError,
  };
}

type ResolvedPendingRequestCandidate = {
  request: StreamerRequest;
  resolved: ResolvedRequestDraft;
};

async function resolvePendingRequestCandidates(currentRequestId: string | undefined) {
  const pendingRequests = await listStreamerRequests();
  const relatedCandidates = pendingRequests.filter((item) => item.databaseId && item.databaseId !== currentRequestId);

  return Promise.all(
    relatedCandidates.map(async (candidate) => ({
      request: candidate,
      resolved: await resolveRequestDraft({
        streamerName: candidate.streamerName,
        kickUrl: candidate.kickUrl,
        youtubeUrl: candidate.youtubeUrl,
      }),
    })),
  ) satisfies Promise<ResolvedPendingRequestCandidate[]>;
}

function shareResolvedAccount(left: ResolvedRequestDraft, right: ResolvedRequestDraft) {
  return Boolean(
    (left.resolvedKick?.slug && right.resolvedKick?.slug && left.resolvedKick.slug === right.resolvedKick.slug) ||
      (left.resolvedYouTube && right.resolvedYouTube && isSameYouTubeAccount(left.resolvedYouTube, right.resolvedYouTube)),
  );
}

function mergeResolvedAccountData(target: ResolvedRequestDraft, source: ResolvedRequestDraft) {
  const warnings: string[] = [];
  let gainedKick = false;
  let gainedYouTube = false;

  if (source.resolvedKick) {
    if (!target.resolvedKick) {
      target.resolvedKick = { ...source.resolvedKick };
      target.draft.kick = { ...source.resolvedKick };
      target.kickError = undefined;
      gainedKick = true;
    } else if (target.resolvedKick.slug === source.resolvedKick.slug) {
      target.resolvedKick = {
        ...source.resolvedKick,
        ...target.resolvedKick,
      };
      target.draft.kick = {
        ...source.resolvedKick,
        ...target.draft.kick,
      };
    } else {
      warnings.push(
        `Related pending requests reference different Kick accounts (${target.resolvedKick.slug} and ${source.resolvedKick.slug}). Review the merged draft before approving.`,
      );
    }
  }

  if (source.resolvedYouTube) {
    if (!target.resolvedYouTube) {
      target.resolvedYouTube = { ...source.resolvedYouTube };
      target.draft.youtube = { ...source.resolvedYouTube };
      target.youtubeError = undefined;
      gainedYouTube = true;
    } else if (isSameYouTubeAccount(target.resolvedYouTube, source.resolvedYouTube)) {
      target.resolvedYouTube = {
        ...source.resolvedYouTube,
        ...target.resolvedYouTube,
      };
      target.draft.youtube = {
        ...source.resolvedYouTube,
        ...target.draft.youtube,
      };
    } else {
      warnings.push("Related pending requests reference different YouTube accounts. Review the merged draft before approving.");
    }
  }

  return {
    gainedKick,
    gainedYouTube,
    warnings,
  };
}

async function enrichResolvedRequestFromQueue(
  resolved: ResolvedRequestDraft,
  resolvedCandidates: ResolvedPendingRequestCandidate[],
) {
  if (!resolvedCandidates.length) {
    return {
      resolved,
      relatedRequestsNote: undefined,
      warning: undefined,
    };
  }
  const aggregate = cloneResolvedRequestDraft(resolved);
  const linkedRequests: StreamerRequest[] = [];
  const warnings = new Set<string>();
  let gainedKickFromQueue = false;
  let gainedYouTubeFromQueue = false;
  let foundRelatedRequest = true;

  while (foundRelatedRequest) {
    foundRelatedRequest = false;

    for (const candidate of resolvedCandidates) {
      if (!candidate.request.databaseId || linkedRequests.some((item) => item.databaseId === candidate.request.databaseId)) {
        continue;
      }

      if (!shareResolvedAccount(aggregate, candidate.resolved)) {
        continue;
      }

      linkedRequests.push(candidate.request);
      foundRelatedRequest = true;

      const mergeResult = mergeResolvedAccountData(aggregate, candidate.resolved);

      gainedKickFromQueue ||= mergeResult.gainedKick;
      gainedYouTubeFromQueue ||= mergeResult.gainedYouTube;

      for (const warning of mergeResult.warnings) {
        warnings.add(warning);
      }
    }
  }

  if (!linkedRequests.length) {
    return {
      resolved,
      relatedRequestsNote: undefined,
      warning: undefined,
    };
  }

  const additions = [
    gainedKickFromQueue ? "Kick" : undefined,
    gainedYouTubeFromQueue ? "YouTube" : undefined,
  ].filter(Boolean);
  const relatedRequestsNote = additions.length
    ? `Found ${linkedRequests.length} related pending request${linkedRequests.length === 1 ? "" : "s"} and filled in the missing ${additions.join(" and ")} account${additions.length === 1 ? "" : "s"} from the request queue.`
    : `Found ${linkedRequests.length} related pending request${linkedRequests.length === 1 ? "" : "s"} with the same account while processing this request.`;

  return {
    resolved: aggregate,
    relatedRequestsNote,
    warning: Array.from(warnings).join(" "),
  };
}

function buildPendingRequestCandidate(
  candidate: ResolvedPendingRequestCandidate,
  resolved: ResolvedRequestDraft,
  preview: AdminStreamerPreview,
): PendingRequestCandidate | null {
  const currentHasKickOnly = onlyKick(resolved.draft);
  const currentHasYouTubeOnly = onlyYouTube(resolved.draft);
  const candidateHasKickOnly = onlyKick(candidate.resolved.draft);
  const candidateHasYouTubeOnly = onlyYouTube(candidate.resolved.draft);
  const currentKeys = currentSuggestionSourceKeys(resolved, preview);

  if (!currentKeys.length) {
    return null;
  }

  const identityMatch =
    currentHasKickOnly && candidateHasYouTubeOnly
      ? scoreIdentityMatch(currentKeys, collectIdentityKeysForPlatform("youtube", candidate.resolved.draft))
      : currentHasYouTubeOnly && candidateHasKickOnly
        ? scoreIdentityMatch(currentKeys, collectIdentityKeysForPlatform("kick", candidate.resolved.draft))
        : null;

  if (!identityMatch || identityMatch.score < 58 || !candidate.request.databaseId) {
    return null;
  }

  return {
    requestId: candidate.request.databaseId,
    streamerName: candidate.request.streamerName,
    kickUrl: candidate.request.kickUrl,
    youtubeUrl: candidate.request.youtubeUrl,
    platforms: describeStreamerPlatforms(candidate.resolved.draft),
    score: identityMatch.score,
    reason: identityMatch.reason,
  };
}

function buildPendingRequestCandidates(
  resolved: ResolvedRequestDraft,
  preview: AdminStreamerPreview,
  resolvedCandidates: ResolvedPendingRequestCandidate[],
) {
  if (hasKick(resolved.draft) === hasYouTube(resolved.draft)) {
    return [] as PendingRequestCandidate[];
  }

  return resolvedCandidates
    .map((candidate) => buildPendingRequestCandidate(candidate, resolved, preview))
    .filter((candidate): candidate is PendingRequestCandidate => Boolean(candidate))
    .sort((a, b) => (b.score - a.score) || a.streamerName.localeCompare(b.streamerName))
    .slice(0, 5);
}

function buildAppliedHelperRequestsNote(appliedRequests: StreamerRequest[], gainedKick: boolean, gainedYouTube: boolean) {
  if (!appliedRequests.length) {
    return undefined;
  }

  const additions = [gainedKick ? "Kick" : undefined, gainedYouTube ? "YouTube" : undefined].filter(Boolean);

  if (!additions.length) {
    return `Used ${appliedRequests.length} pending helper request${appliedRequests.length === 1 ? "" : "s"} while processing this draft.`;
  }

  return `Used ${appliedRequests.length} pending helper request${appliedRequests.length === 1 ? "" : "s"} to fill the missing ${additions.join(" and ")} account${additions.length === 1 ? "" : "s"}.`;
}

function applySelectedHelperRequests(
  selectedHelperRequestIds: string[] | undefined,
  resolved: ResolvedRequestDraft,
  resolvedCandidates: ResolvedPendingRequestCandidate[],
  availableCandidates: PendingRequestCandidate[],
) {
  if (!selectedHelperRequestIds?.length) {
    return {
      resolved,
      appliedHelperRequestIds: [] as string[],
      appliedHelperRequestsNote: undefined,
      warning: undefined,
    };
  }

  const selectedIdSet = new Set(selectedHelperRequestIds);
  const allowedIdSet = new Set(availableCandidates.map((candidate) => candidate.requestId));
  const selectedCandidates = resolvedCandidates.filter(
    (candidate) => candidate.request.databaseId && selectedIdSet.has(candidate.request.databaseId) && allowedIdSet.has(candidate.request.databaseId),
  );

  if (!selectedCandidates.length) {
    return {
      resolved,
      appliedHelperRequestIds: [] as string[],
      appliedHelperRequestsNote: undefined,
      warning: undefined,
    };
  }

  const aggregate = cloneResolvedRequestDraft(resolved);
  const appliedRequests: StreamerRequest[] = [];
  const warnings = new Set<string>();
  let gainedKick = false;
  let gainedYouTube = false;

  for (const candidate of selectedCandidates) {
    if (!candidate.request.databaseId) {
      continue;
    }

    const mergeResult = mergeResolvedAccountData(aggregate, candidate.resolved);

    if (!mergeResult.gainedKick && !mergeResult.gainedYouTube) {
      continue;
    }

    appliedRequests.push(candidate.request);
    gainedKick ||= mergeResult.gainedKick;
    gainedYouTube ||= mergeResult.gainedYouTube;

    for (const warning of mergeResult.warnings) {
      warnings.add(warning);
    }
  }

  return {
    resolved: aggregate,
    appliedHelperRequestIds: appliedRequests.map((request) => request.databaseId as string),
    appliedHelperRequestsNote: buildAppliedHelperRequestsNote(appliedRequests, gainedKick, gainedYouTube),
    warning: Array.from(warnings).join(" "),
  };
}

function mergeResolvedRequestIntoStreamer(target: AdminStreamer, resolved: ResolvedRequestDraft) {
  const draft = cloneStreamer(
    sanitizeStreamerInput({
      id: target.id,
      displayName: target.displayName,
      group: target.group,
      isActive: target.isActive,
      kick: target.kick ? { ...target.kick } : undefined,
      youtube: target.youtube ? { ...target.youtube } : undefined,
    }),
  );
  const warnings: string[] = [];

  if (resolved.resolvedKick) {
    if (!draft.kick) {
      draft.kick = { ...resolved.resolvedKick };
    } else if (draft.kick.slug === resolved.resolvedKick.slug) {
      draft.kick = {
        ...resolved.resolvedKick,
        ...draft.kick,
      };
    } else {
      warnings.push(
        `Submitted Kick account ${resolved.resolvedKick.profileUrl ?? resolved.resolvedKick.slug} was not merged because ${target.displayName} already has Kick account ${draft.kick.profileUrl ?? `https://kick.com/${draft.kick.slug}`}.`,
      );
    }
  }

  if (resolved.resolvedYouTube) {
    if (!draft.youtube) {
      draft.youtube = { ...resolved.resolvedYouTube };
    } else if (isSameYouTubeAccount(draft.youtube, resolved.resolvedYouTube)) {
      draft.youtube = {
        ...resolved.resolvedYouTube,
        ...draft.youtube,
      };
    } else {
      warnings.push(
        `Submitted YouTube account ${resolved.resolvedYouTube.profileUrl ?? resolved.resolvedYouTube.handle ?? resolved.resolvedYouTube.channelId ?? "unknown"} was not merged because ${target.displayName} already has a different YouTube account.`,
      );
    }
  }

  return {
    draft: sanitizeStreamerInput(draft),
    warning: warnings.join(" "),
  };
}

function applySubmittedKickState(preview: AdminStreamerPreview, request: StreamerRequestPreviewInput, resolved: ResolvedRequestDraft) {
  if (!request.kickUrl) {
    return;
  }

  if (resolved.resolvedKick) {
    preview.platforms.kick = {
      ...preview.platforms.kick,
      submittedUrl: request.kickUrl,
    };
    return;
  }

  preview.platforms.kick = {
    ...preview.platforms.kick,
    state: preview.platforms.kick.state === "resolved" ? preview.platforms.kick.state : "error",
    submittedUrl: request.kickUrl,
    message: resolved.kickError ?? preview.platforms.kick.message ?? "Kick details could not be resolved.",
  };
}

function applySubmittedYouTubeState(preview: AdminStreamerPreview, request: StreamerRequestPreviewInput, resolved: ResolvedRequestDraft) {
  if (!request.youtubeUrl) {
    return;
  }

  if (resolved.resolvedYouTube) {
    preview.platforms.youtube = {
      ...preview.platforms.youtube,
      submittedUrl: request.youtubeUrl,
    };
    return;
  }

  preview.platforms.youtube = {
    ...preview.platforms.youtube,
    state: preview.platforms.youtube.state === "resolved" ? preview.platforms.youtube.state : "error",
    submittedUrl: request.youtubeUrl,
    message: resolved.youtubeError ?? preview.platforms.youtube.message ?? "YouTube details could not be resolved.",
  };
}

async function buildKickPreview(streamer: Streamer, submittedUrl?: string): Promise<AdminPlatformPreview> {
  if (!streamer.kick?.slug) {
    return {
      state: "missing",
      submittedUrl,
      message: submittedUrl ? "Kick details could not be resolved." : "No Kick account linked.",
    };
  }

  const status = await fetchKickStatus(buildPreviewPlatformStreamer(streamer, "kick"));

  return {
    state: status.error ? "error" : "resolved",
    submittedUrl,
    canonicalUrl: status.profileUrl ?? canonicalKickProfileUrl(streamer.kick.slug),
    message: status.error,
    status,
  };
}

async function buildYouTubePreview(streamer: Streamer, submittedUrl?: string): Promise<AdminPlatformPreview> {
  if (!streamer.youtube?.channelId && !streamer.youtube?.handle && !streamer.youtube?.profileUrl) {
    return {
      state: "missing",
      submittedUrl,
      message: submittedUrl ? "YouTube details could not be resolved." : "No YouTube account linked.",
    };
  }

  const status = await fetchYouTubeStatus(buildPreviewPlatformStreamer(streamer, "youtube"));

  return {
    state: status.error ? "error" : "resolved",
    submittedUrl,
    canonicalUrl: status.profileUrl ?? streamer.youtube?.profileUrl,
    message: status.error,
    status,
  };
}

export async function buildPreviewFromDraft(streamer: Streamer): Promise<AdminStreamerPreview> {
  const draft = sanitizeStreamerInput(streamer);
  const [kick, youtube] = await Promise.all([buildKickPreview(draft), buildYouTubePreview(draft)]);
  const enrichedDraft: Streamer = {
    ...draft,
    kick: draft.kick ? { ...draft.kick, profileUrl: kick.canonicalUrl ?? draft.kick.profileUrl } : undefined,
    youtube: draft.youtube ? { ...draft.youtube, profileUrl: youtube.canonicalUrl ?? draft.youtube.profileUrl } : undefined,
  };

  applyResolvedArt(enrichedDraft, "kick", kick.status);
  applyResolvedArt(enrichedDraft, "youtube", youtube.status);

  return {
    draft: sanitizeStreamerInput(enrichedDraft),
    platforms: {
      kick,
      youtube,
    },
  };
}

export async function buildPreviewFromRequest(
  request: StreamerRequestPreviewInput,
  existingStreamers: AdminStreamer[],
): Promise<AdminStreamerPreview> {
  const resolved = await resolveRequestDraft(request);
  const resolvedCandidates = request.requestId ? await resolvePendingRequestCandidates(request.requestId) : [];
  const queueContext = await enrichResolvedRequestFromQueue(resolved, resolvedCandidates);
  const selectedTarget =
    request.targetDatabaseId ? existingStreamers.find((streamer) => streamer.databaseId === request.targetDatabaseId) : undefined;
  const basePreview = await buildPreviewFromDraft(queueContext.resolved.draft);
  const namedBasePreview = applyResolvedDisplayName(basePreview);
  const pendingRequestCandidates = buildPendingRequestCandidates(queueContext.resolved, namedBasePreview, resolvedCandidates);
  const helperContext = applySelectedHelperRequests(
    request.selectedHelperRequestIds,
    queueContext.resolved,
    resolvedCandidates,
    pendingRequestCandidates,
  );
  const mergeResult = selectedTarget ? mergeResolvedRequestIntoStreamer(selectedTarget, helperContext.resolved) : undefined;
  const preview = await buildPreviewFromDraft(mergeResult?.draft ?? helperContext.resolved.draft);
  const namedPreview = mergeResult ? preview : applyResolvedDisplayName(preview);
  const matchCandidates = buildMatchCandidates(helperContext.resolved, namedPreview, existingStreamers);

  applySubmittedKickState(namedPreview, request, helperContext.resolved);
  applySubmittedYouTubeState(namedPreview, request, helperContext.resolved);

  return {
    ...namedPreview,
    appliedHelperRequestIds: helperContext.appliedHelperRequestIds,
    appliedHelperRequestsNote: helperContext.appliedHelperRequestsNote,
    matchCandidates,
    pendingRequestCandidates,
    selectedTargetDatabaseId: selectedTarget?.databaseId,
    relatedRequestsNote: queueContext.relatedRequestsNote,
    mergeWarning:
      [queueContext.warning, helperContext.warning, mergeResult?.warning]
        .filter(Boolean)
        .join(" ") ||
      (request.targetDatabaseId && !selectedTarget ? "The selected streamer could not be found. Review the request and choose again." : undefined),
  };
}
