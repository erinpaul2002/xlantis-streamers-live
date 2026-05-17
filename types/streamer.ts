export type Platform = "youtube" | "kick";

export type StreamerGroup = "TVA" | "KVA" | "Admins" | "Others";

export type KickAccount = {
  slug: string;
  avatarUrl?: string;
  fallbackThumbnailUrl?: string;
  profileUrl?: string;
};

export type YouTubeAccount = {
  channelId?: string;
  handle?: string;
  avatarUrl?: string;
  fallbackThumbnailUrl?: string;
  profileUrl?: string;
};

export type Streamer = {
  id: string;
  displayName: string;
  group: StreamerGroup;
  isActive: boolean;
  kick?: KickAccount;
  youtube?: YouTubeAccount;
};

export type PlatformStreamer = {
  id: string;
  streamerId: string;
  displayName: string;
  platform: Platform;
  group: StreamerGroup;
  isActive: boolean;
  youtubeChannelId?: string;
  youtubeHandle?: string;
  kickSlug?: string;
  avatarUrl?: string;
  fallbackThumbnailUrl?: string;
  profileUrl?: string;
};
