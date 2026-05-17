"use client";
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import type { AdminFieldErrors, AdminStreamerPreview } from "@/types/admin-streamer";
import type { StreamStatus } from "@/types/status";
import type { Streamer, StreamerGroup } from "@/types/streamer";

const groups: StreamerGroup[] = ["TVA", "KVA", "Admins", "Others"];

type AdminStreamerEditorProps = {
  form: Streamer;
  fieldErrors?: AdminFieldErrors;
  preview?: AdminStreamerPreview;
  disabled?: boolean;
  note?: ReactNode;
  onChange: (value: Streamer) => void;
};

function Card({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-4 sm:p-5">
      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#7f8c99]">{eyebrow}</div>
      <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function FieldShell({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.24em] text-[#92a0ad]">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <div className="mt-2 text-xs font-semibold text-[#66717d]">{hint}</div> : null}
      {error ? <div className="mt-2 text-xs font-black text-[#ff8e8e]">{error}</div> : null}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      className="h-12 w-full border border-white/12 bg-[#07090c] px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#5f6973] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={[
        "relative inline-flex h-11 w-[88px] items-center border px-3 text-xs font-black uppercase tracking-[0.24em] transition",
        checked ? "border-[#53fc18]/40 bg-[#53fc18]/14 text-[#a0ff84]" : "border-white/12 bg-white/5 text-[#8a96a3]",
      ].join(" ")}
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span
        className={[
          "absolute top-1.5 h-7 w-7 bg-white transition",
          checked ? "left-[52px] bg-[#53fc18]" : "left-1.5 bg-[#8a96a3]",
        ].join(" ")}
      />
      <span className="relative z-10">{checked ? "On" : "Off"}</span>
    </button>
  );
}

function pickFeaturedStatus(preview: AdminStreamerPreview | undefined) {
  const statuses = [preview?.platforms.kick.status, preview?.platforms.youtube.status].filter(Boolean) as StreamStatus[];

  return statuses.find((item) => item.isLive) ?? statuses[0];
}

function PreviewStateCard({
  title,
  preview,
}: {
  title: string;
  preview?: AdminStreamerPreview["platforms"]["kick"];
}) {
  const tone =
    preview?.state === "resolved"
      ? "border-[#53fc18]/25 bg-[#53fc18]/8 text-[#a0ff84]"
      : preview?.state === "error"
        ? "border-[#ff4d4d]/25 bg-[#ff4d4d]/8 text-[#ff9797]"
        : "border-white/10 bg-white/5 text-[#7e8a96]";

  return (
    <div className="border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-white">{title}</div>
        <div className={["border px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em]", tone].join(" ")}>
          {preview?.state ?? "missing"}
        </div>
      </div>

      {preview?.status?.avatarUrl ? (
        <div className="mt-4 flex items-center gap-3">
          <img
            alt={`${title} avatar`}
            className="h-12 w-12 border border-white/10 bg-[#0f141a] object-cover"
            src={preview.status.avatarUrl}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{preview.status.displayName}</div>
            <div className="truncate text-xs font-semibold text-[#7f8b97]">{preview.status.isLive ? "Live now" : "Offline snapshot"}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 text-xs font-semibold text-[#8f9ba7]">
        {preview?.submittedUrl ? <div>Submitted: {preview.submittedUrl}</div> : null}
        {preview?.canonicalUrl ? (
          <a className="truncate text-[#8dff63] underline-offset-4 hover:underline" href={preview.canonicalUrl} rel="noreferrer" target="_blank">
            {preview.canonicalUrl}
          </a>
        ) : null}
        {preview?.message ? <div className="text-[#ff9797]">{preview.message}</div> : null}
      </div>
    </div>
  );
}

export function AdminStreamerEditor({
  form,
  fieldErrors,
  preview,
  disabled,
  note,
  onChange,
}: AdminStreamerEditorProps) {
  const featuredStatus = pickFeaturedStatus(preview);

  const setCore = <Key extends keyof Streamer>(key: Key, value: Streamer[Key]) => {
    onChange({
      ...form,
      [key]: value,
    });
  };

  const setKick = (patch: Partial<NonNullable<Streamer["kick"]>>) => {
    onChange({
      ...form,
      kick: {
        slug: "",
        ...form.kick,
        ...patch,
      },
    });
  };

  const setYouTube = (patch: Partial<NonNullable<Streamer["youtube"]>>) => {
    onChange({
      ...form,
      youtube: {
        ...form.youtube,
        ...patch,
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
      <div className="grid gap-5">
        {note ? <div className="border border-[#53fc18]/20 bg-[#53fc18]/8 px-4 py-3 text-sm font-semibold text-[#c9ffb6]">{note}</div> : null}

        <Card eyebrow="Core Record" title="Streamer identity">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell error={fieldErrors?.displayName} label="Display name">
              <TextInput disabled={disabled} placeholder="Streamer display name" value={form.displayName} onChange={(value) => setCore("displayName", value)} />
            </FieldShell>

            <FieldShell error={fieldErrors?.id} hint="Lowercase ID used internally." label="Logical ID">
              <TextInput disabled={disabled} placeholder="others-streamer-name" value={form.id} onChange={(value) => setCore("id", value)} />
            </FieldShell>

            <FieldShell label="Group">
              <select
                className="h-12 w-full border border-white/12 bg-[#07090c] px-4 text-sm font-bold text-white outline-none transition focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled}
                value={form.group}
                onChange={(event) => setCore("group", event.target.value as StreamerGroup)}
              >
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </FieldShell>

            <FieldShell hint="Inactive streamers stay out of the public dashboard." label="Active status">
              <Toggle checked={form.isActive} disabled={disabled} onChange={(value) => setCore("isActive", value)} />
            </FieldShell>
          </div>
        </Card>

        <Card eyebrow="Kick Account" title="Kick details">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell error={fieldErrors?.["kick.slug"]} label="Slug">
              <TextInput disabled={disabled} placeholder="kickname" value={form.kick?.slug} onChange={(value) => setKick({ slug: value })} />
            </FieldShell>

            <FieldShell label="Profile URL">
              <TextInput
                disabled={disabled}
                placeholder="https://kick.com/streamer"
                value={form.kick?.profileUrl}
                onChange={(value) => setKick({ profileUrl: value })}
              />
            </FieldShell>

            <FieldShell label="Avatar URL">
              <TextInput disabled={disabled} placeholder="https://..." value={form.kick?.avatarUrl} onChange={(value) => setKick({ avatarUrl: value })} />
            </FieldShell>

            <FieldShell label="Banner URL">
              <TextInput
                disabled={disabled}
                placeholder="https://..."
                value={form.kick?.fallbackThumbnailUrl}
                onChange={(value) => setKick({ fallbackThumbnailUrl: value })}
              />
            </FieldShell>
          </div>
        </Card>

        <Card eyebrow="YouTube Account" title="YouTube details">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell error={fieldErrors?.["youtube.handle"]} label="Handle">
              <TextInput disabled={disabled} placeholder="@streamer" value={form.youtube?.handle} onChange={(value) => setYouTube({ handle: value })} />
            </FieldShell>

            <FieldShell label="Channel ID">
              <TextInput disabled={disabled} placeholder="UC..." value={form.youtube?.channelId} onChange={(value) => setYouTube({ channelId: value })} />
            </FieldShell>

            <FieldShell error={fieldErrors?.["youtube.profileUrl"]} label="Profile URL">
              <TextInput
                disabled={disabled}
                placeholder="https://www.youtube.com/@streamer"
                value={form.youtube?.profileUrl}
                onChange={(value) => setYouTube({ profileUrl: value })}
              />
            </FieldShell>

            <FieldShell label="Avatar URL">
              <TextInput disabled={disabled} placeholder="https://..." value={form.youtube?.avatarUrl} onChange={(value) => setYouTube({ avatarUrl: value })} />
            </FieldShell>

            <FieldShell label="Banner URL">
              <TextInput
                disabled={disabled}
                placeholder="https://..."
                value={form.youtube?.fallbackThumbnailUrl}
                onChange={(value) => setYouTube({ fallbackThumbnailUrl: value })}
              />
            </FieldShell>
          </div>
        </Card>
      </div>

      <div className="grid gap-5">
        <Card eyebrow="Live Review" title="Preview snapshot">
          {featuredStatus?.thumbnailUrl ? (
            <div className="overflow-hidden border border-white/10 bg-black/30">
              <img alt="Preview thumbnail" className="aspect-video w-full object-cover" src={featuredStatus.thumbnailUrl} />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center border border-dashed border-white/10 bg-black/20 text-sm font-semibold text-[#73808c]">
              Process or refresh a preview to load artwork.
            </div>
          )}

          <div className="grid gap-3 border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              {featuredStatus?.avatarUrl ? (
                <img alt="Streamer avatar" className="h-14 w-14 border border-white/10 bg-[#0f141a] object-cover" src={featuredStatus.avatarUrl} />
              ) : (
                <div className="grid h-14 w-14 place-items-center border border-white/10 bg-[#0f141a] text-xs font-black text-[#7c8793]">XL</div>
              )}

              <div className="min-w-0">
                <div className="truncate text-lg font-black text-white">
                  {featuredStatus?.displayName ?? form.displayName ?? "Streamer preview"}
                </div>
                <div className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#8794a0]">
                  {featuredStatus?.platform ?? "preview"} {featuredStatus?.isLive ? "live" : "offline"}
                </div>
              </div>
            </div>

            <div className="text-sm font-semibold leading-6 text-[#9aa6b2]">
              {featuredStatus?.title ?? "Live title and viewer details appear here once the account lookup succeeds."}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7f8b97]">Viewers</div>
                <div className="mt-2 text-lg font-black text-white">{featuredStatus?.viewerCount?.toLocaleString() ?? "--"}</div>
              </div>
              <div className="border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7f8b97]">Category</div>
                <div className="mt-2 truncate text-lg font-black text-white">{featuredStatus?.category ?? "--"}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card eyebrow="Platform Checks" title="Resolved accounts">
          <PreviewStateCard preview={preview?.platforms.kick} title="Kick" />
          <PreviewStateCard preview={preview?.platforms.youtube} title="YouTube" />
        </Card>
      </div>
    </div>
  );
}
