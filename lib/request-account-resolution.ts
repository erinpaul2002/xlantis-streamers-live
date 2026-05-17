import "server-only";

import type { Streamer } from "@/types/streamer";
import type { StreamerRequestInput } from "@/types/streamer-request";
import {
  buildDefaultStreamerId,
  extractKickSlugFromUrl,
  parseYouTubeUrl,
} from "@/lib/admin-streamer-utils";

export type ResolvedRequestDraft = {
  draft: Streamer;
  resolvedKick?: NonNullable<Streamer["kick"]>;
  resolvedYouTube?: NonNullable<Streamer["youtube"]>;
  kickError?: string;
  youtubeError?: string;
};

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

async function fetchText(url: string) {
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

  return response.text();
}

async function resolveVideoToChannel(videoId: string) {
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  const canonicalBaseUrl =
    decodePageValue(html.match(/"canonicalBaseUrl":"([^"]+)"/)?.[1]) ??
    decodePageValue(html.match(/"ownerProfileUrl":"([^"]+)"/)?.[1]);
  const channelId =
    decodePageValue(html.match(/"channelId":"(UC[\w-]+)"/)?.[1]) ??
    decodePageValue(html.match(/"externalChannelId":"(UC[\w-]+)"/)?.[1]);
  const handle = canonicalBaseUrl?.startsWith("/@") ? canonicalBaseUrl.slice(1) : undefined;

  return {
    channelId,
    handle,
    profileUrl: canonicalBaseUrl
      ? `https://www.youtube.com${canonicalBaseUrl}`
      : channelId
        ? `https://www.youtube.com/channel/${channelId}`
        : undefined,
  };
}

export async function resolveYouTubeInput(urlValue: string | undefined) {
  const parsed = parseYouTubeUrl(urlValue);

  if ("error" in parsed) {
    return parsed;
  }

  if (parsed.videoId) {
    try {
      const resolved = await resolveVideoToChannel(parsed.videoId);

      if (resolved.channelId || resolved.handle || resolved.profileUrl) {
        return resolved;
      }

      return { error: "Could not resolve a YouTube channel from that video." };
    } catch {
      return { error: "Could not resolve a YouTube channel from that video." };
    }
  }

  return parsed;
}

export async function resolveRequestDraft(request: StreamerRequestInput): Promise<ResolvedRequestDraft> {
  const draft: Streamer = {
    id: buildDefaultStreamerId(request.streamerName, "Others"),
    displayName: request.streamerName.trim(),
    group: "Others",
    isActive: true,
  };

  const resolved: ResolvedRequestDraft = {
    draft,
  };

  if (request.kickUrl) {
    const kick = extractKickSlugFromUrl(request.kickUrl);

    if (kick.slug) {
      resolved.resolvedKick = {
        slug: kick.slug,
        profileUrl: kick.profileUrl,
      };
      draft.kick = resolved.resolvedKick;
    } else {
      resolved.kickError = kick.error ?? "Kick details could not be resolved.";
    }
  }

  if (request.youtubeUrl) {
    const youtube = await resolveYouTubeInput(request.youtubeUrl);

    if (!("error" in youtube)) {
      resolved.resolvedYouTube = {
        channelId: youtube.channelId,
        handle: youtube.handle,
        profileUrl: youtube.profileUrl,
      };
      draft.youtube = resolved.resolvedYouTube;
    } else {
      resolved.youtubeError = youtube.error;
    }
  }

  return resolved;
}
