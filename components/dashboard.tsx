"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { PlatformChooserModal, type PlatformChooserOption } from "@/components/platform-chooser-modal";
import { PublicSiteHeader } from "@/components/public-site-header";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { Platform, StreamerGroup } from "@/types/streamer";
import type { StatusResponse, StreamStatus } from "@/types/status";

type DashboardProps = {
  initialNow: string;
  initialStatus: StatusResponse;
};

type PlatformFilter = "all" | Platform;
type GroupFilter = "all" | StreamerGroup;

type StreamerCardAction =
  | {
      kind: "link";
      href: string;
    }
  | {
      kind: "choose";
      onClick: () => void;
    }
  | {
      kind: "none";
    };

const platformFilters: Array<{ label: string; value: PlatformFilter }> = [
  { label: "All", value: "all" },
  { label: "Kick", value: "kick" },
  { label: "YouTube", value: "youtube" },
];

const groupFilters: Array<{ label: string; value: GroupFilter }> = [
  { label: "All", value: "all" },
  { label: "TVA", value: "TVA" },
  { label: "KVA", value: "KVA" },
  { label: "Admins", value: "Admins" },
  { label: "Others", value: "Others" },
];

const headerBranding: Record<GroupFilter, { src: string; alt: string }> = {
  all: { src: "/xlantislogo.png", alt: "Xlantis logo" },
  TVA: { src: "/tvalogo.png", alt: "TVA logo" },
  KVA: { src: "/kvalogo.png", alt: "KVA logo" },
  Admins: { src: "/xlantislogo.png", alt: "Xlantis logo" },
  Others: { src: "/xlantislogo.png", alt: "Xlantis logo" },
};

const offlineStatusMessage = "You're offline. Reconnect to load fresh live stream data.";

function formatCount(value: number | undefined) {
  if (value === undefined) {
    return "Viewers unavailable";
  }

  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatViewerBadge(status: StreamStatus) {
  if (!status.isLive) {
    return "Offline";
  }

  if (status.viewerCount === undefined) {
    return "Viewers unavailable";
  }

  return `${formatCount(status.viewerCount)} watching`;
}

function formatRelativeTime(value: string | undefined, fallback = "Just checked", now = Date.now()) {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return fallback;
  }

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function platformLabel(platform: Platform) {
  return platform === "kick" ? "Kick" : "YouTube";
}

function livePlatformLabel(platform: Platform) {
  return `Live on ${platformLabel(platform)}`;
}

function platformPriority(platform: Platform) {
  return platform === "kick" ? 0 : 1;
}

function getDisplayImageUrl(value: string | undefined) {
  if (!value) {
    return value;
  }

  // Netlify was serving the same cached /api/image response for different query strings
  // in production. Using the original asset URL keeps each streamer image distinct.
  return value;
}

function filterStatus(
  status: StreamStatus,
  search: string,
  platform: PlatformFilter,
  group: GroupFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch =
    !normalizedSearch ||
    status.displayName.toLowerCase().includes(normalizedSearch) ||
    status.title?.toLowerCase().includes(normalizedSearch) ||
    status.category?.toLowerCase().includes(normalizedSearch);

  return (
    matchesSearch &&
    (platform === "all" || status.platform === platform) &&
    (group === "all" || status.group === group)
  );
}

function getBaseStreamerId(status: StreamStatus) {
  const separatorIndex = status.streamerId.lastIndexOf(":");

  return separatorIndex === -1 ? status.streamerId : status.streamerId.slice(0, separatorIndex);
}

function collapseAllFilterStatuses(statuses: StreamStatus[]) {
  const seenStreamerIds = new Set<string>();

  return statuses.filter((status) => {
    const streamerId = getBaseStreamerId(status);

    if (seenStreamerIds.has(streamerId)) {
      return false;
    }

    seenStreamerIds.add(streamerId);

    return true;
  });
}

function getDestinationHref(status: StreamStatus) {
  const href = status.streamUrl ?? status.profileUrl;

  return href && href !== "#" ? href : undefined;
}

function buildStatusesByStreamer(statuses: StreamStatus[]) {
  const grouped = new Map<string, StreamStatus[]>();

  for (const status of statuses) {
    const streamerId = getBaseStreamerId(status);
    const current = grouped.get(streamerId) ?? [];

    current.push(status);
    grouped.set(streamerId, current);
  }

  grouped.forEach((items) => items.sort((a, b) => platformPriority(a.platform) - platformPriority(b.platform)));

  return grouped;
}

function buildChooserOptions(statuses: StreamStatus[]): PlatformChooserOption[] {
  return [...statuses]
    .sort((a, b) => platformPriority(a.platform) - platformPriority(b.platform))
    .flatMap((status) => {
      const href = getDestinationHref(status);

      if (!href) {
        return [];
      }

      return [
        {
          platform: status.platform,
          href,
          statusLabel:
            status.isLive && status.viewerCount !== undefined
              ? `Live now - ${formatCount(status.viewerCount)} watching`
              : status.isLive
                ? "Live now"
                : "Offline channel",
          helperLabel: status.isLive
            ? `Go to the ${platformLabel(status.platform)} live stream`
            : `Open the ${platformLabel(status.platform)} channel page`,
        },
      ];
    });
}

function Thumbnail({ status }: { status: StreamStatus }) {
  const imageUrl = getDisplayImageUrl(status.thumbnailUrl);

  return (
    <div
      className={[
        "relative aspect-video overflow-hidden rounded-lg bg-[#171b20]",
        status.isLive ? "shadow-[0_18px_44px_rgba(0,0,0,0.34)]" : "opacity-70 grayscale",
      ].join(" ")}
    >
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-[1.035]"
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#53fc18_0,#1b2b18_24%,#111519_58%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-transparent to-black/10" />

      {status.isLive ? (
        <span className="absolute left-2 top-2 rounded bg-[#53fc18] px-2 py-0.5 text-[11px] font-black uppercase tracking-normal text-black">
          Live
        </span>
      ) : null}

      <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded bg-black/76 px-2 py-1 text-xs font-bold text-white backdrop-blur">
        {formatViewerBadge(status)}
      </span>
    </div>
  );
}

function StreamerCard({
  now,
  status,
  action,
}: {
  now: number;
  status: StreamStatus;
  action: StreamerCardAction;
}) {
  const platformAccent = status.platform === "kick" ? "group-hover:text-[#53fc18]" : "group-hover:text-[#ff3b3b]";
  const avatarUrl = getDisplayImageUrl(status.avatarUrl);
  const title =
    action.kind === "choose"
      ? `${status.displayName}: choose Kick or YouTube`
      : status.error
        ? `${status.displayName}: ${status.error}`
        : status.displayName;
  const cardClassName = "group block min-w-0 text-left";
  const content = (
    <>
      <Thumbnail status={status} />

      <div className="mt-3 grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-3">
        <div
          className={[
            "h-11 w-11 rounded-full border bg-[#171b20] bg-cover bg-center",
            status.isLive ? "border-[#53fc18]/70" : "border-white/10 grayscale",
          ].join(" ")}
          style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
        />

        <div className="min-w-0">
          <div className={`truncate text-sm font-extrabold text-white transition ${platformAccent}`}>
            {status.displayName}
          </div>
          <div className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[#b9bec5]">
            {status.title ?? (status.error ? "Status currently unavailable" : "Channel is offline")}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#2f353d] px-2 py-0.5 text-xs font-bold text-[#e8eaed]">
              {status.category ?? "Grand Theft Auto V"}
            </span>
            {status.platforms.map((platform) => (
              <span
                key={platform}
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  platform === "kick" ? "bg-[#53fc18]/16 text-[#73ff44]" : "bg-[#ff3030]/18 text-[#ff7777]",
                  status.platform === platform ? "ring-1 ring-white/20" : "opacity-75",
                ].join(" ")}
              >
                {status.isLive && status.platform === platform ? livePlatformLabel(platform) : platformLabel(platform)}
              </span>
            ))}
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs font-bold text-[#b9bec5]">
              {status.group}
            </span>
          </div>
          <div className="mt-2 text-xs font-medium text-[#7e858e]">
            {status.isLive
              ? `Started ${formatRelativeTime(status.startedAt, "recently", now)}`
              : `Checked ${formatRelativeTime(status.lastCheckedAt, "Just checked", now)}`}
          </div>
        </div>
      </div>
    </>
  );

  if (action.kind === "link") {
    return (
      <a className={cardClassName} href={action.href} target="_blank" rel="noreferrer" title={title}>
        {content}
      </a>
    );
  }

  if (action.kind === "choose") {
    return (
      <button
        className={`${cardClassName} w-full border-0 bg-transparent p-0`}
        type="button"
        title={title}
        aria-label={`Choose a platform for ${status.displayName}`}
        onClick={action.onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${cardClassName} cursor-default`} title={title}>
      {content}
    </div>
  );
}

function FilterButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "h-8 shrink-0 rounded-full px-3 text-xs font-bold transition sm:h-9 sm:rounded-md sm:text-sm",
        isActive
          ? "bg-white text-black"
          : "bg-[#1a1f25] text-[#aeb4bc] hover:bg-[#262d35] hover:text-white",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function Dashboard({ initialNow, initialStatus }: DashboardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [now, setNow] = useState(() => {
    const timestamp = new Date(initialNow).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  });
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [chooserStreamerId, setChooserStreamerId] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const lastScrollYRef = useRef(0);
  const lastToggleScrollYRef = useRef(0);
  const isOnline = useOnlineStatus();
  const clientError = isOnline ? refreshError : offlineStatusMessage;

  async function refreshStatus() {
    if (!isOnline) {
      return;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch("/api/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Status endpoint returned ${response.status}`);
      }

      setStatus((await response.json()) as StatusResponse);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }

  const runRefresh = useEffectEvent(() => {
    void refreshStatus();
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      runRefresh();
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isOnline) {
      const refreshTimeout = window.setTimeout(() => {
        runRefresh();
      }, 0);

      return () => window.clearTimeout(refreshTimeout);
    }
  }, [isOnline]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    lastToggleScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      setShowBackToTop(currentScrollY > 520);

      setIsHeaderCollapsed((currentState) => {
        if (!currentState) {
          if (currentScrollY > 160 && delta > 6) {
            lastToggleScrollYRef.current = currentScrollY;
            return true;
          }

          return false;
        }

        const scrolledUpEnough = lastToggleScrollYRef.current - currentScrollY > 96;

        if (currentScrollY < 64 || (delta < -10 && scrolledUpEnough)) {
          lastToggleScrollYRef.current = currentScrollY;
          return false;
        }

        return true;
      });

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const allStatuses = useMemo(() => [...status.live, ...status.offline], [status]);
  const statusesByStreamer = useMemo(() => buildStatusesByStreamer(allStatuses), [allStatuses]);
  const chooserOptionsByStreamer = useMemo(() => {
    const options = new Map<string, PlatformChooserOption[]>();

    statusesByStreamer.forEach((streamerStatuses, streamerId) => {
      options.set(streamerId, buildChooserOptions(streamerStatuses));
    });

    return options;
  }, [statusesByStreamer]);
  const filtered = useMemo(() => {
    const matchingStatuses = allStatuses.filter((item) => filterStatus(item, search, platform, group));

    return platform === "all" ? collapseAllFilterStatuses(matchingStatuses) : matchingStatuses;
  }, [allStatuses, search, platform, group]);
  const chooserStatuses = chooserStreamerId ? statusesByStreamer.get(chooserStreamerId) ?? [] : [];
  const chooserOptions = chooserStreamerId ? chooserOptionsByStreamer.get(chooserStreamerId) ?? [] : [];
  const chooserStreamerName = chooserStatuses[0]?.displayName ?? "";
  const activeChooserStreamerId = platform === "all" && chooserOptions.length > 1 ? chooserStreamerId : null;
  const liveCount = filtered.filter((item) => item.isLive).length;
  const offlineCount = filtered.length - liveCount;
  const activeHeaderBrand = headerBranding[group];
  const isShowingOfflineState = !isOnline;

  function getCardAction(item: StreamStatus): StreamerCardAction {
    const directHref = getDestinationHref(item);

    if (platform !== "all" || item.isLive) {
      return directHref ? { kind: "link", href: directHref } : { kind: "none" };
    }

    const streamerId = getBaseStreamerId(item);
    const chooserCandidates = chooserOptionsByStreamer.get(streamerId) ?? [];

    if (chooserCandidates.length > 1) {
      return {
        kind: "choose",
        onClick: () => setChooserStreamerId(streamerId),
      };
    }

    if (chooserCandidates.length === 1) {
      return {
        kind: "link",
        href: chooserCandidates[0].href,
      };
    }

    return directHref ? { kind: "link", href: directHref } : { kind: "none" };
  }

  return (
    <main className="min-h-screen bg-[#080a0d] text-white">
      <PublicSiteHeader
        title="Xlantis Live"
        subtitle="Curated GTA RP streams across Kick and YouTube"
        sticky
        collapsed={isHeaderCollapsed}
        brandImage={activeHeaderBrand}
        mobileTopAction={
          <Link
            className="grid h-10 w-10 place-items-center rounded-full border border-[#53fc18]/50 bg-[#53fc18]/12 text-sm font-black text-[#8dff63] transition hover:border-[#53fc18] hover:bg-[#53fc18] hover:text-black"
            href="/request"
            aria-label="Request streamer"
            title="Request streamer"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 19a4 4 0 0 0-8 0" />
              <circle cx="11" cy="8" r="3" />
              <path d="M19 8v6" />
              <path d="M16 11h6" />
            </svg>
          </Link>
        }
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#aeb4bc] sm:left-4 sm:h-4 sm:w-4" />
              <input
                className="h-10 w-full rounded-xl border border-white/18 bg-[#101419] px-10 text-sm font-semibold text-white outline-none transition placeholder:text-[#7f8791] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20 sm:h-12 sm:rounded-md sm:px-11 sm:text-base"
                placeholder="Search streamers, titles, categories"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Link
              className="hidden h-12 shrink-0 place-items-center rounded-md border border-[#53fc18]/50 bg-[#53fc18]/12 px-4 text-sm font-black text-[#8dff63] transition hover:border-[#53fc18] hover:bg-[#53fc18] hover:text-black sm:grid"
              href="/request"
              aria-label="Request streamer"
              title="Request streamer"
            >
              <span>Request streamer</span>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
            {platformFilters.map((item) => (
              <FilterButton
                key={item.value}
                isActive={platform === item.value}
                label={item.label}
                onClick={() => {
                  setPlatform(item.value);

                  if (item.value !== "all") {
                    setChooserStreamerId(null);
                  }
                }}
              />
            ))}
            </div>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
            {groupFilters.map((item) => (
              <FilterButton
                key={item.value}
                isActive={group === item.value}
                label={item.label}
                onClick={() => setGroup(item.value)}
              />
            ))}
            </div>
          </div>
        </div>
      </PublicSiteHeader>

      <section className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 border-b border-white/10 pb-4 md:mb-6 md:pb-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black tracking-normal text-white sm:text-3xl">
              <span className="text-[#00e7ff]">Streams</span> For You
            </h2>

            <button
              className="h-9 shrink-0 rounded-xl bg-[#53fc18] px-4 text-xs font-black text-black transition hover:bg-[#7cff4c] disabled:cursor-wait disabled:opacity-70 sm:h-10 sm:rounded-md sm:text-sm"
              type="button"
              onClick={refreshStatus}
              disabled={isRefreshing || !isOnline}
            >
              {isOnline ? (isRefreshing ? "Refreshing" : "Refresh") : "Offline"}
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:mt-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <p className="text-xs font-semibold text-[#8c949d] sm:text-sm">
              {isShowingOfflineState
                ? "Offline mode. Reconnect to load current live stream status."
                : `${liveCount} live, ${offlineCount} offline. Updated ${formatRelativeTime(status.lastUpdatedAt, "Just checked", now)}.`}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {clientError && !isShowingOfflineState ? (
                <span className="rounded-xl bg-[#ff3030]/12 px-3 py-2 text-xs font-bold text-[#ff8888] sm:rounded-md sm:text-sm">
                  {clientError}
                </span>
              ) : null}
              {isShowingOfflineState ? (
                <span className="rounded-xl bg-[#ffd166]/12 px-3 py-2 text-xs font-bold text-[#ffe6a3] sm:rounded-md sm:text-sm">
                  Offline mode
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isShowingOfflineState ? (
          <div className="grid min-h-[45vh] place-items-center rounded-lg border border-[#ffd166]/18 bg-[#101419] px-6 text-center">
            <div>
              <h2 className="text-2xl font-black text-white">You&apos;re offline</h2>
              <p className="mt-2 max-w-md text-sm font-semibold text-[#b8c0c9]">
                The app shell is available, but live stream data cannot load until your connection comes back.
              </p>
            </div>
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1720px]:grid-cols-6">
            {filtered.map((item) => (
              <StreamerCard key={item.streamerId} now={now} status={item} action={getCardAction(item)} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[45vh] place-items-center rounded-lg border border-white/10 bg-[#101419] px-6 text-center">
            <div>
              <h2 className="text-2xl font-black text-white">No streams match these filters</h2>
              <p className="mt-2 max-w-md text-sm font-semibold text-[#8c949d]">
                Try another platform, group, or search term.
              </p>
            </div>
          </div>
        )}
      </section>

      {activeChooserStreamerId ? (
        <PlatformChooserModal
          streamerName={chooserStreamerName}
          options={chooserOptions}
          onClose={() => setChooserStreamerId(null)}
        />
      ) : null}

      {showBackToTop ? (
        <button
          className="fixed bottom-5 right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-[#11161b]/92 text-lg font-black text-white shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur sm:bottom-6 sm:right-6"
          type="button"
          aria-label="Back to top"
          title="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ^
        </button>
      ) : null}
    </main>
  );
}
