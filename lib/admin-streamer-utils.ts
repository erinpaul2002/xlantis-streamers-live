import type { AdminFieldErrors } from "@/types/admin-streamer";
import type { Streamer, StreamerGroup, YouTubeAccount } from "@/types/streamer";
import type { AdminStreamer } from "@/lib/db/streamers";

const streamerGroups = ["TVA", "KVA", "Admins", "Others"] as const satisfies StreamerGroup[];

const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const kickHosts = new Set(["kick.com", "www.kick.com"]);

type ValidationResult =
  | { ok: true; value: Streamer }
  | { ok: false; fieldErrors: AdminFieldErrors; value: Streamer };

function trimOptional(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHandle(handle: string) {
  const trimmed = trimOptional(handle);

  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function normalizeProfileUrl(value: string | undefined) {
  const trimmed = trimOptional(value);

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    url.hash = "";

    if ((url.protocol === "https:" || url.protocol === "http:") && url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

export function normalizeYouTubeIdentity(account: YouTubeAccount | undefined) {
  const channelId = trimOptional(account?.channelId).toUpperCase() || undefined;
  const handle = normalizeHandle(account?.handle ?? "")?.toLowerCase();
  const profileUrl = normalizeProfileUrl(account?.profileUrl)?.toLowerCase();

  return { channelId, handle, profileUrl };
}

export function isSameYouTubeAccount(a: YouTubeAccount | undefined, b: YouTubeAccount | undefined) {
  const left = normalizeYouTubeIdentity(a);
  const right = normalizeYouTubeIdentity(b);

  return Boolean(
    (left.channelId && right.channelId && left.channelId === right.channelId) ||
      (left.handle && right.handle && left.handle === right.handle) ||
      (left.profileUrl && right.profileUrl && left.profileUrl === right.profileUrl),
  );
}

function isTruthyString(value: string | undefined) {
  return Boolean(value && value.trim());
}

function cleanKickAccount(streamer: Streamer) {
  const slug = trimOptional(streamer.kick?.slug).toLowerCase();

  if (!slug) {
    return undefined;
  }

  return {
    slug,
    avatarUrl: normalizeProfileUrl(streamer.kick?.avatarUrl),
    fallbackThumbnailUrl: normalizeProfileUrl(streamer.kick?.fallbackThumbnailUrl),
    profileUrl: normalizeProfileUrl(streamer.kick?.profileUrl) ?? `https://kick.com/${slug}`,
  };
}

function cleanYouTubeAccount(streamer: Streamer) {
  const channelId = trimOptional(streamer.youtube?.channelId) || undefined;
  const handle = normalizeHandle(streamer.youtube?.handle ?? "");
  const profileUrl = normalizeProfileUrl(streamer.youtube?.profileUrl);

  if (!channelId && !handle && !profileUrl) {
    return undefined;
  }

  return {
    channelId,
    handle,
    avatarUrl: normalizeProfileUrl(streamer.youtube?.avatarUrl),
    fallbackThumbnailUrl: normalizeProfileUrl(streamer.youtube?.fallbackThumbnailUrl),
    profileUrl:
      profileUrl ??
      (handle ? `https://www.youtube.com/${handle}` : channelId ? `https://www.youtube.com/channel/${channelId}` : undefined),
  };
}

export function slugifyLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function buildDefaultStreamerId(displayName: string, group: StreamerGroup = "Others") {
  const nameSlug = slugifyLabel(displayName) || "streamer";

  return `${group.toLowerCase()}-${nameSlug}`;
}

export function sanitizeStreamerInput(streamer: Streamer): Streamer {
  const displayName = trimOptional(streamer.displayName);
  const id = slugifyLabel(streamer.id) || buildDefaultStreamerId(displayName || streamer.displayName || "streamer");
  const group = streamerGroups.includes(streamer.group) ? streamer.group : "Others";

  return {
    id,
    displayName,
    group,
    isActive: Boolean(streamer.isActive),
    kick: cleanKickAccount(streamer),
    youtube: cleanYouTubeAccount(streamer),
  };
}

export function validateAdminStreamerInput(
  streamer: Streamer,
  existingStreamers: AdminStreamer[],
  options?: { ignoreDatabaseId?: string },
): ValidationResult {
  const value = sanitizeStreamerInput(streamer);
  const fieldErrors: AdminFieldErrors = {};

  if (value.displayName.length < 2) {
    fieldErrors.displayName = "Enter a streamer name.";
  }

  if (!value.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id)) {
    fieldErrors.id = "Use lowercase letters, numbers, and hyphens only.";
  }

  if (!value.kick && !value.youtube) {
    fieldErrors["kick.slug"] = "Add at least one platform account.";
    fieldErrors["youtube.profileUrl"] = "Add at least one platform account.";
  }

  if (value.youtube?.handle && !value.youtube.handle.startsWith("@")) {
    fieldErrors["youtube.handle"] = "YouTube handles should start with @.";
  }

  const relevantStreamers = existingStreamers.filter((item) => item.databaseId !== options?.ignoreDatabaseId);
  const duplicateId = relevantStreamers.find((item) => item.id.toLowerCase() === value.id.toLowerCase());

  if (duplicateId) {
    fieldErrors.id = "This streamer ID already exists.";
  }

  if (value.kick?.slug) {
    const duplicateKick = relevantStreamers.find((item) => item.kick?.slug?.toLowerCase() === value.kick?.slug.toLowerCase());

    if (duplicateKick) {
      fieldErrors["kick.slug"] = "That Kick account already belongs to another streamer.";
    }
  }

  const youtubeIdentity = normalizeYouTubeIdentity(value.youtube);

  if (youtubeIdentity.channelId || youtubeIdentity.handle || youtubeIdentity.profileUrl) {
    const duplicateYoutube = relevantStreamers.find((item) => {
      const candidate = normalizeYouTubeIdentity(item.youtube);

      return Boolean(
        (youtubeIdentity.channelId && candidate.channelId === youtubeIdentity.channelId) ||
          (youtubeIdentity.handle && candidate.handle === youtubeIdentity.handle) ||
          (youtubeIdentity.profileUrl && candidate.profileUrl === youtubeIdentity.profileUrl),
      );
    });

    if (duplicateYoutube) {
      fieldErrors["youtube.profileUrl"] = "That YouTube account already belongs to another streamer.";
    }
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, fieldErrors, value };
  }

  return { ok: true, value };
}

export function canonicalKickProfileUrl(slug: string | undefined) {
  return isTruthyString(slug) ? `https://kick.com/${trimOptional(slug).toLowerCase()}` : undefined;
}

export function extractKickSlugFromUrl(urlValue: string | undefined) {
  const value = trimOptional(urlValue);

  if (!value) {
    return { error: "Add a Kick URL." };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { error: "Enter a valid Kick URL." };
  }

  if (!kickHosts.has(url.hostname.toLowerCase())) {
    return { error: "Use a Kick profile URL." };
  }

  const slug = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();

  if (!slug) {
    return { error: "Kick URL must include a channel slug." };
  }

  return {
    slug,
    profileUrl: canonicalKickProfileUrl(slug),
  };
}

export function parseYouTubeUrl(urlValue: string | undefined) {
  const value = trimOptional(urlValue);

  if (!value) {
    return { error: "Add a YouTube URL." };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { error: "Enter a valid YouTube URL." };
  }

  const host = url.hostname.toLowerCase();

  if (!youtubeHosts.has(host)) {
    return { error: "Use a YouTube channel, handle, or video URL." };
  }

  if (host === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];

    return videoId ? { videoId } : { error: "YouTube short links must include a video ID." };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0];
  const second = segments[1];

  if (first === "watch") {
    const videoId = url.searchParams.get("v")?.trim();

    return videoId ? { videoId } : { error: "YouTube watch URLs must include a video ID." };
  }

  if (first === "shorts" || first === "live") {
    return second ? { videoId: second } : { error: "That YouTube URL is missing its video ID." };
  }

  if (first?.startsWith("@")) {
    const handle = normalizeHandle(first);

    return handle
      ? {
          handle,
          profileUrl: `https://www.youtube.com/${handle}`,
        }
      : { error: "Could not read that YouTube handle." };
  }

  if (first === "channel" && second) {
    return {
      channelId: second,
      profileUrl: `https://www.youtube.com/channel/${second}`,
    };
  }

  if (first) {
    return {
      profileUrl: `https://www.youtube.com/${segments.join("/")}`,
    };
  }

  return { error: "Could not understand that YouTube URL." };
}
