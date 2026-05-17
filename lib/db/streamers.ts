import { api } from "@/convex/_generated/api";
import { requireConvexClient } from "@/lib/convex/client";
import type { PlatformStreamer, Streamer } from "@/types/streamer";

type StreamerRecord = Streamer & {
  _id?: string;
  _creationTime?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type AdminStreamer = Streamer & {
  databaseId?: string;
  createdAt?: string;
  updatedAt?: string;
};

function hasKickAccount(streamer: Streamer) {
  return Boolean(streamer.kick?.slug);
}

function hasYouTubeAccount(streamer: Streamer) {
  return Boolean(streamer.youtube?.channelId || streamer.youtube?.handle || streamer.youtube?.profileUrl);
}

function isActiveStreamer(streamer: Streamer) {
  if (!streamer.isActive) {
    return false;
  }

  return hasKickAccount(streamer) || hasYouTubeAccount(streamer);
}

function compareByName(a: { displayName: string }, b: { displayName: string }) {
  return a.displayName.localeCompare(b.displayName);
}

function toStreamer(streamer: StreamerRecord): Streamer {
  return {
    id: streamer.id,
    displayName: streamer.displayName,
    group: streamer.group,
    isActive: streamer.isActive,
    kick: streamer.kick,
    youtube: streamer.youtube,
  };
}

function toAdminStreamer(streamer: StreamerRecord): AdminStreamer {
  return {
    ...toStreamer(streamer),
    databaseId: streamer._id ? String(streamer._id) : undefined,
    createdAt: streamer.createdAt ? new Date(streamer.createdAt).toISOString() : undefined,
    updatedAt: streamer.updatedAt ? new Date(streamer.updatedAt).toISOString() : undefined,
  };
}

export { toAdminStreamer };

export function expandStreamerPlatforms(streamers: Streamer[]): PlatformStreamer[] {
  return streamers.flatMap((streamer) => {
    const platforms: PlatformStreamer[] = [];

    if (hasKickAccount(streamer) && streamer.kick) {
      platforms.push({
        id: `${streamer.id}:kick`,
        streamerId: streamer.id,
        displayName: streamer.displayName,
        platform: "kick",
        group: streamer.group,
        isActive: streamer.isActive,
        kickSlug: streamer.kick.slug,
        avatarUrl: streamer.kick.avatarUrl,
        fallbackThumbnailUrl: streamer.kick.fallbackThumbnailUrl,
        profileUrl: streamer.kick.profileUrl,
      });
    }

    if (hasYouTubeAccount(streamer) && streamer.youtube) {
      platforms.push({
        id: `${streamer.id}:youtube`,
        streamerId: streamer.id,
        displayName: streamer.displayName,
        platform: "youtube",
        group: streamer.group,
        isActive: streamer.isActive,
        youtubeChannelId: streamer.youtube.channelId,
        youtubeHandle: streamer.youtube.handle,
        avatarUrl: streamer.youtube.avatarUrl,
        fallbackThumbnailUrl: streamer.youtube.fallbackThumbnailUrl,
        profileUrl: streamer.youtube.profileUrl,
      });
    }

    return platforms;
  });
}

export async function getStreamers(): Promise<Streamer[]> {
  const client = requireConvexClient();
  const dbStreamers = await client.query(api.streamers.listActive, {});

  return dbStreamers.map(toStreamer).filter(isActiveStreamer).sort(compareByName);
}

export async function getAdminStreamers(): Promise<AdminStreamer[]> {
  const client = requireConvexClient();
  const dbStreamers = await client.query(api.streamers.list, {});

  return dbStreamers.map(toAdminStreamer).sort(compareByName);
}

export async function createAdminStreamer(streamer: Streamer): Promise<AdminStreamer> {
  const client = requireConvexClient();
  const created = await client.mutation(api.streamers.create, {
    streamer,
  });

  if (!created) {
    throw new Error("Convex did not return the created streamer.");
  }

  return toAdminStreamer(created);
}

export async function updateAdminStreamer(databaseId: string, streamer: Streamer): Promise<AdminStreamer> {
  const client = requireConvexClient();
  const updated = await client.mutation(api.streamers.update, {
    databaseId,
    streamer,
  });

  if (!updated) {
    throw new Error("Convex did not return the updated streamer.");
  }

  return toAdminStreamer(updated);
}

export async function deleteAdminStreamer(databaseId: string): Promise<AdminStreamer> {
  const client = requireConvexClient();
  const result = await client.mutation(api.streamers.deleteById, {
    databaseId,
  });

  if (!result?.streamer) {
    throw new Error("Convex did not return the deleted streamer.");
  }

  return toAdminStreamer(result.streamer);
}
