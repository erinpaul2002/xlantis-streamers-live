import type { PlatformStreamer } from "@/types/streamer";
import type { StreamStatus } from "@/types/status";

type YouTubeSearchResponse = {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      title?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    liveStreamingDetails?: {
      actualStartTime?: string;
      concurrentViewers?: string;
    };
  }>;
};

type YouTubeChannelsResponse = {
  items?: Array<{
    id?: string;
    brandingSettings?: {
      image?: {
        bannerExternalUrl?: string;
      };
    };
    snippet?: {
      title?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
};

type ResolvedYouTubeChannel = {
  channelId?: string;
  title?: string;
  avatarUrl?: string;
  bannerUrl?: string;
};

type FetchedPage = {
  html: string;
  url: string;
};

const API_BACKOFF_MS = 5 * 60_000;

let apiBackoffUntil = 0;

function nonEmpty(value: string | undefined) {
  return value && value.trim() ? value : undefined;
}

function decodePageValue(value: string | undefined) {
  return nonEmpty(value)
    ?.replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getInitials(value: string) {
  return value
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const initials = getInitials(streamer.displayName) || "YT";
  const displayName = escapeXml(streamer.displayName);

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#281111"/>
          <stop offset="0.5" stop-color="#0b0f12"/>
          <stop offset="1" stop-color="#171d26"/>
        </linearGradient>
        <radialGradient id="pulse" cx="25%" cy="26%" r="62%">
          <stop offset="0" stop-color="#ff3030" stop-opacity="0.8"/>
          <stop offset="0.36" stop-color="#ff3030" stop-opacity="0.16"/>
          <stop offset="1" stop-color="#ff3030" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="540" fill="url(#bg)"/>
      <rect width="960" height="540" fill="url(#pulse)"/>
      <path d="M0 420 C180 350 300 500 500 430 S800 350 960 395 V540 H0 Z" fill="#ff3030" opacity="0.1"/>
      <text x="56" y="90" fill="#ff7777" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900">YOUTUBE</text>
      <text x="56" y="314" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="124" font-weight="900">${initials}</text>
      <text x="60" y="378" fill="#aeb7c2" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">${displayName}</text>
      <text x="60" y="425" fill="#6f7882" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Offline now</text>
    </svg>
  `);
}

function generatedAvatar(streamer: PlatformStreamer) {
  const initials = getInitials(streamer.displayName) || "YT";

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="128" fill="#171111"/>
      <circle cx="78" cy="70" r="94" fill="#ff3030" opacity="0.32"/>
      <text x="128" y="150" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="900">${initials}</text>
    </svg>
  `);
}

function getBestThumbnail(
  thumbnails: Record<string, { url?: string }> | undefined,
  fallback: string | undefined,
) {
  return (
    nonEmpty(thumbnails?.maxres?.url) ??
    nonEmpty(thumbnails?.standard?.url) ??
    nonEmpty(thumbnails?.high?.url) ??
    nonEmpty(thumbnails?.medium?.url) ??
    nonEmpty(thumbnails?.default?.url) ??
    nonEmpty(fallback)
  );
}

function normalizeHandle(handle: string) {
  const decoded = decodeURIComponent(handle);

  return decoded.startsWith("@") ? decoded : `@${decoded}`;
}

function getProfileUrl(streamer: PlatformStreamer) {
  if (streamer.profileUrl) {
    return streamer.profileUrl;
  }

  if (streamer.youtubeHandle) {
    return `https://www.youtube.com/${normalizeHandle(streamer.youtubeHandle)}`;
  }

  if (streamer.youtubeChannelId) {
    return `https://www.youtube.com/channel/${streamer.youtubeChannelId}`;
  }

  return undefined;
}

function getLiveUrl(streamer: PlatformStreamer) {
  const profileUrl = getProfileUrl(streamer);

  if (!profileUrl) {
    return undefined;
  }

  return `${profileUrl.replace(/\/$/, "")}/live`;
}

function getOfflineArt(streamer: PlatformStreamer, channel?: ResolvedYouTubeChannel) {
  const avatarUrl = nonEmpty(channel?.avatarUrl) ?? nonEmpty(streamer.avatarUrl) ?? generatedAvatar(streamer);

  return {
    avatarUrl,
    thumbnailUrl:
      nonEmpty(channel?.bannerUrl) ??
      nonEmpty(streamer.fallbackThumbnailUrl) ??
      avatarUrl ??
      generatedBanner(streamer),
  };
}

function offlineStatus(
  streamer: PlatformStreamer,
  lastCheckedAt: string,
  error?: string,
  channel?: ResolvedYouTubeChannel,
): StreamStatus {
  const art = getOfflineArt(streamer, channel);

  return {
    streamerId: streamer.id,
    displayName: channel?.title ?? streamer.displayName,
    platform: streamer.platform,
    platforms: [streamer.platform],
    group: streamer.group,
    isLive: false,
    thumbnailUrl: art.thumbnailUrl,
    avatarUrl: art.avatarUrl,
    streamUrl: getProfileUrl(streamer),
    profileUrl: getProfileUrl(streamer),
    lastCheckedAt,
    error,
  };
}

async function fetchPage(url: string): Promise<FetchedPage> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "XlantisLive/1.0",
    },
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube page returned ${response.status}`);
  }

  return {
    html: await response.text(),
    url: response.url,
  };
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      apiBackoffUntil = Date.now() + API_BACKOFF_MS;
    }

    let detail = "";

    try {
      const payload = (await response.json()) as { error?: { errors?: Array<{ reason?: string }>; message?: string } };
      detail = payload.error?.errors?.[0]?.reason ?? payload.error?.message ?? "";
    } catch {
      detail = "";
    }

    throw new Error(detail ? `YouTube returned ${response.status}: ${detail}` : `YouTube returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function parseChannelPage(html: string): ResolvedYouTubeChannel {
  return {
    channelId:
      decodePageValue(html.match(/"externalId":"(UC[\w-]+)"/)?.[1]) ??
      decodePageValue(html.match(/"browseId":"(UC[\w-]+)"/)?.[1]) ??
      decodePageValue(html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)/)?.[1]),
    title:
      decodePageValue(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]) ??
      decodePageValue(html.match(/"title":"([^"]+)"/)?.[1]),
    avatarUrl: decodePageValue(html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]),
    bannerUrl: decodePageValue(html.match(/"banner".*?"url":"([^"]+)"/)?.[1]),
  };
}

async function resolveChannelFromPage(streamer: PlatformStreamer) {
  const profileUrl = getProfileUrl(streamer);

  if (!profileUrl) {
    return undefined;
  }

  try {
    return parseChannelPage((await fetchPage(profileUrl)).html);
  } catch {
    return undefined;
  }
}

function extractWatchVideoId(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value, "https://www.youtube.com");
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtube.com" || host === "m.youtube.com") {
      return nonEmpty(url.searchParams.get("v") ?? undefined) ?? undefined;
    }

    if (host === "youtu.be") {
      return nonEmpty(url.pathname.split("/").filter(Boolean)[0]) ?? undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function parseLivePage(page: FetchedPage) {
  const canonicalUrl =
    decodePageValue(page.html.match(/<meta property="og:url" content="([^"]+)"/)?.[1]) ??
    decodePageValue(page.html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]) ??
    decodePageValue(page.html.match(/"canonicalUrl":"([^"]+)"/)?.[1]);
  const shortLinkUrl = decodePageValue(page.html.match(/<link rel="shortlinkUrl" href="([^"]+)"/)?.[1]);
  const videoId =
    extractWatchVideoId(page.url) ??
    extractWatchVideoId(canonicalUrl) ??
    extractWatchVideoId(shortLinkUrl) ??
    decodePageValue(page.html.match(/window\['ytCommand'\]\s*=\s*\{[\s\S]*?"watchEndpoint":\{"videoId":"([^"]+)"/)?.[1]) ??
    decodePageValue(page.html.match(/"videoDetails":\{"videoId":"([^"]+)"/)?.[1]) ??
    decodePageValue(page.html.match(/"currentVideoEndpoint":\{"watchEndpoint":\{"videoId":"([^"]+)"/)?.[1]);
  const viewerCount = parseViewerCount(page.html);

  const isLive =
    page.html.includes('"isLiveNow":true') ||
    page.html.includes('"isLiveContent":true') ||
    page.html.includes('"isLiveBroadcast" content="True"') ||
    page.html.includes('"liveStreamabilityRenderer"') ||
    page.html.includes('"is_viewed_live","value":"True"') ||
    page.html.includes('"style":"LIVE"') ||
    page.html.includes('"text":"LIVE"');

  if (!videoId || !isLive) {
    return undefined;
  }

  return {
    videoId,
    title:
      decodePageValue(page.html.match(/<meta property="og:title" content="([^"]+)"/)?.[1]) ??
      decodePageValue(page.html.match(/"title":"([^"]+)"/)?.[1]) ??
      "Live now",
    thumbnailUrl:
      decodePageValue(page.html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]) ??
      `https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`,
    viewerCount,
  };
}

function parseCompactNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim().toLowerCase();
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([km])?$/);

  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

function parseViewerCount(html: string) {
  const watchingText =
    decodePageValue(html.match(/([0-9][0-9,.]*|[0-9]+(?:\.[0-9]+)?[KkMm])\s+watching(?:\s+now)?/)?.[1]) ??
    decodePageValue(html.match(/"runs":\[\{"text":"([0-9][0-9,.]*|[0-9]+(?:\.[0-9]+)?[KkMm])"\},\{"text":" watching/)?.[1]);

  return watchingText ? parseCompactNumber(watchingText) : undefined;
}

async function fetchLiveStatusFromPage(
  streamer: PlatformStreamer,
  lastCheckedAt: string,
  channel?: ResolvedYouTubeChannel,
) {
  const liveUrl = getLiveUrl(streamer);

  if (!liveUrl) {
    return undefined;
  }

  try {
    const live = parseLivePage(await fetchPage(liveUrl));

    if (!live) {
      return undefined;
    }

    const art = getOfflineArt(streamer, channel);

    return {
      streamerId: streamer.id,
      displayName: channel?.title ?? streamer.displayName,
      platform: streamer.platform,
      platforms: [streamer.platform],
      group: streamer.group,
      isLive: true,
      title: live.title,
      thumbnailUrl: live.thumbnailUrl,
      avatarUrl: art.avatarUrl,
      viewerCount: live.viewerCount,
      category: "Grand Theft Auto V",
      streamUrl: `https://www.youtube.com/watch?v=${live.videoId}`,
      profileUrl: getProfileUrl(streamer),
      lastCheckedAt,
    } satisfies StreamStatus;
  } catch {
    return undefined;
  }
}

async function resolveChannelFromApi(streamer: PlatformStreamer, apiKey: string) {
  if (Date.now() < apiBackoffUntil) {
    return undefined;
  }

  if (streamer.youtubeChannelId) {
    return {
      channelId: streamer.youtubeChannelId,
      avatarUrl: streamer.avatarUrl,
      bannerUrl: streamer.fallbackThumbnailUrl,
      title: streamer.displayName,
    };
  }

  if (!streamer.youtubeHandle) {
    return undefined;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,brandingSettings");
  url.searchParams.set("forHandle", normalizeHandle(streamer.youtubeHandle));
  url.searchParams.set("key", apiKey);

  const channels = await fetchJson<YouTubeChannelsResponse>(url);
  const channel = channels.items?.[0];

  if (!channel?.id) {
    return undefined;
  }

  return {
    channelId: channel.id,
    title: channel.snippet?.title,
    avatarUrl: getBestThumbnail(channel.snippet?.thumbnails, streamer.avatarUrl),
    bannerUrl: nonEmpty(channel.brandingSettings?.image?.bannerExternalUrl),
  };
}

async function fetchLiveStatusFromApi(
  streamer: PlatformStreamer,
  lastCheckedAt: string,
  channel: ResolvedYouTubeChannel,
  apiKey: string,
) {
  if (!channel.channelId || Date.now() < apiBackoffUntil) {
    return undefined;
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channel.channelId);
  searchUrl.searchParams.set("eventType", "live");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("key", apiKey);

  const search = await fetchJson<YouTubeSearchResponse>(searchUrl);
  const videoId = search.items?.[0]?.id?.videoId;

  if (!videoId) {
    return undefined;
  }

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet,liveStreamingDetails");
  videosUrl.searchParams.set("id", videoId);
  videosUrl.searchParams.set("key", apiKey);

  const videos = await fetchJson<YouTubeVideosResponse>(videosUrl);
  const video = videos.items?.[0];
  const viewerCount = Number(video?.liveStreamingDetails?.concurrentViewers);

  return {
    streamerId: streamer.id,
    displayName: channel.title ?? streamer.displayName,
    platform: streamer.platform,
    platforms: [streamer.platform],
    group: streamer.group,
    isLive: true,
    title: video?.snippet?.title ?? search.items?.[0]?.snippet?.title ?? "Live now",
    thumbnailUrl:
      getBestThumbnail(video?.snippet?.thumbnails, streamer.fallbackThumbnailUrl) ??
      channel.bannerUrl ??
      channel.avatarUrl ??
      generatedBanner(streamer),
    avatarUrl: channel.avatarUrl ?? streamer.avatarUrl ?? generatedAvatar(streamer),
    viewerCount: Number.isFinite(viewerCount) ? viewerCount : undefined,
    category: "Grand Theft Auto V",
    startedAt: video?.liveStreamingDetails?.actualStartTime,
    streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
    profileUrl: getProfileUrl(streamer),
    lastCheckedAt,
  } satisfies StreamStatus;
}

export async function fetchYouTubeStatus(streamer: PlatformStreamer): Promise<StreamStatus> {
  const lastCheckedAt = new Date().toISOString();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!streamer.youtubeChannelId && !streamer.youtubeHandle && !streamer.profileUrl) {
    return offlineStatus(streamer, lastCheckedAt, "Missing YouTube channel ID, handle, or profile URL");
  }

  const pageChannel = await resolveChannelFromPage(streamer);
  const pageLive = await fetchLiveStatusFromPage(streamer, lastCheckedAt, pageChannel);

  if (pageLive) {
    return pageLive;
  }

  if (apiKey && Date.now() >= apiBackoffUntil) {
    try {
      const apiChannel = (await resolveChannelFromApi(streamer, apiKey)) ?? pageChannel;

      if (apiChannel) {
        const apiLive = await fetchLiveStatusFromApi(streamer, lastCheckedAt, apiChannel, apiKey);

        if (apiLive) {
          return apiLive;
        }

        return offlineStatus(streamer, lastCheckedAt, undefined, apiChannel);
      }
    } catch {
      // Public page fallback above keeps the UI useful when quota or restrictions block API calls.
    }
  }

  return offlineStatus(streamer, lastCheckedAt, undefined, pageChannel);
}
