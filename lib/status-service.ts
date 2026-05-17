import { isFresh, type CacheEntry } from "@/lib/cache/memory-cache";
import { expandStreamerPlatforms, getStreamers } from "@/lib/db/streamers";
import { fetchKickStatus } from "@/lib/platforms/kick";
import { fetchYouTubeStatus } from "@/lib/platforms/youtube";
import type { Platform, PlatformStreamer, Streamer } from "@/types/streamer";
import type { StatusResponse, StreamStatus } from "@/types/status";

const STATUS_TTL_MS = 60_000;

let statusCache: CacheEntry<StatusResponse> | null = null;

function compareStatuses(a: StreamStatus, b: StreamStatus) {
  const byName = a.displayName.localeCompare(b.displayName);

  if (byName !== 0) {
    return byName;
  }

  return platformPriority(a.platform) - platformPriority(b.platform);
}

function platformPriority(platform: Platform) {
  return platform === "kick" ? 0 : 1;
}

function comparePlatformStatus(a: StreamStatus, b: StreamStatus) {
  const viewerDelta = (b.viewerCount ?? -1) - (a.viewerCount ?? -1);

  if (viewerDelta !== 0) {
    return viewerDelta;
  }

  return platformPriority(a.platform) - platformPriority(b.platform);
}

async function fetchPlatformStatus(streamer: PlatformStreamer) {
  if (streamer.platform === "youtube") {
    return fetchYouTubeStatus(streamer);
  }

  return fetchKickStatus(streamer);
}

async function fetchStreamerStatuses(streamer: Streamer): Promise<StreamStatus[]> {
  const platformStreamers = expandStreamerPlatforms([streamer]);
  const platforms = platformStreamers
    .map((platformStreamer) => platformStreamer.platform)
    .sort((a, b) => platformPriority(a) - platformPriority(b));
  const platformStatuses = await Promise.all(platformStreamers.map(fetchPlatformStatus));

  return platformStatuses.map((status) => ({
    ...status,
    platforms,
  }));
}

export async function getStatusResponse(): Promise<StatusResponse> {
  if (isFresh(statusCache)) {
    return statusCache.value;
  }

  const streamers = await getStreamers();
  const statuses = (await Promise.all(streamers.map(fetchStreamerStatuses))).flat();
  const liveStatuses = statuses.filter((status) => status.isLive).sort(comparePlatformStatus);
  const offlineStatuses = statuses.filter((status) => !status.isLive).sort(compareStatuses);
  const response: StatusResponse = {
    live: liveStatuses,
    offline: offlineStatuses,
    lastUpdatedAt: new Date().toISOString(),
  };

  statusCache = {
    value: response,
    expiresAt: Date.now() + STATUS_TTL_MS,
  };

  return response;
}
