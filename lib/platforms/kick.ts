import type { PlatformStreamer } from "@/types/streamer";
import type { StreamStatus } from "@/types/status";

type KickTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  token_type?: string;
};

type KickChannel = {
  banner_picture?: string;
  broadcaster_user_id?: number;
  category?: {
    name?: string;
    thumbnail?: string;
  };
  slug?: string;
  stream?: {
    is_live?: boolean;
    start_time?: string;
    thumbnail?: string;
    viewer_count?: number;
  };
  stream_title?: string;
  user?: {
    username?: string;
  };
};

type KickChannelsResponse = {
  data?: KickChannel[];
  message?: string;
};

type KickUser = {
  profile_picture?: string;
};

type KickUsersResponse = {
  data?: KickUser[];
};

type KickTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: KickTokenCache | null = null;

function getInitials(value: string) {
  return value
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function nonEmpty(value: string | undefined) {
  return value && value.trim() ? value : undefined;
}

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generatedBanner(streamer: PlatformStreamer) {
  const initials = getInitials(streamer.displayName) || "XL";
  const displayName = escapeXml(streamer.displayName);

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#182018"/>
          <stop offset="0.45" stop-color="#0b0f12"/>
          <stop offset="1" stop-color="#17242b"/>
        </linearGradient>
        <radialGradient id="pulse" cx="27%" cy="30%" r="60%">
          <stop offset="0" stop-color="#53fc18" stop-opacity="0.85"/>
          <stop offset="0.34" stop-color="#53fc18" stop-opacity="0.16"/>
          <stop offset="1" stop-color="#53fc18" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="540" fill="url(#bg)"/>
      <rect width="960" height="540" fill="url(#pulse)"/>
      <path d="M0 430 C180 370 260 510 470 440 S790 340 960 400 V540 H0 Z" fill="#53fc18" opacity="0.1"/>
      <text x="56" y="90" fill="#53fc18" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900">XLANTIS LIVE</text>
      <text x="56" y="314" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="124" font-weight="900">${initials}</text>
      <text x="60" y="378" fill="#aeb7c2" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${displayName}</text>
      <text x="60" y="425" fill="#6f7882" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Offline now</text>
    </svg>
  `);
}

function generatedAvatar(streamer: PlatformStreamer) {
  const initials = getInitials(streamer.displayName) || "XL";

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="128" fill="#11171d"/>
      <circle cx="76" cy="68" r="92" fill="#53fc18" opacity="0.3"/>
      <text x="128" y="150" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="900">${initials}</text>
    </svg>
  `);
}

function getOfflineArt(streamer: PlatformStreamer, channel?: KickChannel, profilePicture?: string) {
  const avatarUrl = nonEmpty(profilePicture) ?? nonEmpty(streamer.avatarUrl) ?? generatedAvatar(streamer);

  return {
    avatarUrl,
    thumbnailUrl:
      nonEmpty(channel?.banner_picture) ??
      avatarUrl ??
      nonEmpty(streamer.fallbackThumbnailUrl) ??
      generatedBanner(streamer),
  };
}

function offlineStatus(
  streamer: PlatformStreamer,
  lastCheckedAt: string,
  error?: string,
  channel?: KickChannel,
  profilePicture?: string,
): StreamStatus {
  const art = getOfflineArt(streamer, channel, profilePicture);

  return {
    streamerId: streamer.id,
    displayName: nonEmpty(channel?.user?.username) ?? streamer.displayName,
    platform: streamer.platform,
    platforms: [streamer.platform],
    group: streamer.group,
    isLive: false,
    thumbnailUrl: art.thumbnailUrl,
    avatarUrl: art.avatarUrl,
    streamUrl: streamer.profileUrl,
    profileUrl: streamer.profileUrl,
    lastCheckedAt,
    error,
  };
}

async function getKickAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing KICK_CLIENT_ID or KICK_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    throw new Error(`Kick token endpoint returned ${response.status}`);
  }

  const token = (await response.json()) as KickTokenResponse;

  if (!token.access_token) {
    throw new Error("Kick token response did not include an access token");
  }

  const expiresIn = Number(token.expires_in);
  tokenCache = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn * 1000 : 3_300_000),
  };

  return tokenCache.accessToken;
}

async function fetchKickProfilePicture(accessToken: string, broadcasterUserId: number | undefined) {
  if (!broadcasterUserId) {
    return undefined;
  }

  const url = new URL("https://api.kick.com/public/v1/users");
  url.searchParams.append("id", String(broadcasterUserId));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as KickUsersResponse;

  return nonEmpty(payload.data?.[0]?.profile_picture);
}

export async function fetchKickStatus(streamer: PlatformStreamer): Promise<StreamStatus> {
  const lastCheckedAt = new Date().toISOString();

  if (!streamer.kickSlug) {
    return offlineStatus(streamer, lastCheckedAt, "Missing Kick slug");
  }

  try {
    const accessToken = await getKickAccessToken();
    const url = new URL("https://api.kick.com/public/v1/channels");
    url.searchParams.append("slug", streamer.kickSlug);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      next: {
        revalidate: 0,
      },
    });

    if (!response.ok) {
      throw new Error(`Kick channels endpoint returned ${response.status}`);
    }

    const payload = (await response.json()) as KickChannelsResponse;
    const channel = payload.data?.[0];

    if (!channel) {
      return offlineStatus(streamer, lastCheckedAt, "Kick channel was not found");
    }

    const profilePicture = await fetchKickProfilePicture(accessToken, channel.broadcaster_user_id);

    if (!channel.stream?.is_live) {
      return offlineStatus(streamer, lastCheckedAt, undefined, channel, profilePicture);
    }

    return {
      streamerId: streamer.id,
      displayName: nonEmpty(channel.user?.username) ?? streamer.displayName,
      platform: streamer.platform,
      platforms: [streamer.platform],
      group: streamer.group,
      isLive: true,
      title: channel.stream_title ?? "Live now",
      thumbnailUrl:
        nonEmpty(channel.stream.thumbnail) ??
        nonEmpty(channel.category?.thumbnail) ??
        nonEmpty(channel.banner_picture) ??
        nonEmpty(profilePicture) ??
        nonEmpty(streamer.fallbackThumbnailUrl) ??
        generatedBanner(streamer),
      avatarUrl: nonEmpty(profilePicture) ?? nonEmpty(streamer.avatarUrl) ?? generatedAvatar(streamer),
      viewerCount: channel.stream.viewer_count,
      category: channel.category?.name ?? "Grand Theft Auto V",
      startedAt: channel.stream.start_time,
      streamUrl: `https://kick.com/${channel.slug ?? streamer.kickSlug}`,
      profileUrl: streamer.profileUrl ?? `https://kick.com/${streamer.kickSlug}`,
      lastCheckedAt,
    };
  } catch (error) {
    return offlineStatus(
      streamer,
      lastCheckedAt,
      error instanceof Error ? error.message : "Kick request failed",
    );
  }
}
