import type { Platform, StreamerGroup } from "./streamer";

export type StreamStatus = {
  streamerId: string;
  displayName: string;
  platform: Platform;
  platforms: Platform[];
  group: StreamerGroup;
  isLive: boolean;
  title?: string;
  thumbnailUrl?: string;
  avatarUrl?: string;
  viewerCount?: number;
  category?: string;
  startedAt?: string;
  streamUrl?: string;
  profileUrl?: string;
  lastCheckedAt: string;
  error?: string;
};

export type StatusResponse = {
  live: StreamStatus[];
  offline: StreamStatus[];
  lastUpdatedAt: string;
};
