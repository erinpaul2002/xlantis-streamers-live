"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin-modal";
import { AdminStreamerEditor } from "@/components/admin-streamer-editor";
import type { AdminStreamer } from "@/lib/db/streamers";
import type {
  AdminFieldErrors,
  AdminStreamerDeleteResponse,
  AdminStreamerMutationResponse,
  AdminStreamerPreview,
  AdminStreamerPreviewResponse,
} from "@/types/admin-streamer";

function formatDate(value: string | undefined) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sortStreamers(streamers: AdminStreamer[]) {
  return [...streamers].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function platformLabels(streamer: AdminStreamer) {
  const labels = [];

  if (streamer.kick?.slug) {
    labels.push("Kick");
  }

  if (streamer.youtube?.channelId || streamer.youtube?.handle || streamer.youtube?.profileUrl) {
    labels.push("YouTube");
  }

  return labels.length ? labels.join(" + ") : "No accounts";
}

function accountValues(streamer: AdminStreamer) {
  const values = [];

  if (streamer.kick?.slug) {
    values.push(`kick.com/${streamer.kick.slug}`);
  }

  if (streamer.youtube?.handle) {
    values.push(streamer.youtube.handle);
  } else if (streamer.youtube?.channelId) {
    values.push(streamer.youtube.channelId);
  } else if (streamer.youtube?.profileUrl) {
    values.push(streamer.youtube.profileUrl);
  }

  return values.length ? values : ["No linked platform accounts"];
}

export function AdminStreamersManager({ initialStreamers }: { initialStreamers: AdminStreamer[] }) {
  const router = useRouter();
  const [streamers, setStreamers] = useState(() => sortStreamers(initialStreamers));
  const [selected, setSelected] = useState<AdminStreamer | null>(null);
  const [draft, setDraft] = useState<AdminStreamer | null>(null);
  const [preview, setPreview] = useState<AdminStreamerPreview | undefined>();
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  async function refreshPreview(target: AdminStreamer) {
    setIsPreviewing(true);

    try {
      const response = await fetch("/api/admin/streamers/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamer: target,
        }),
      });
      const result = (await response.json()) as AdminStreamerPreviewResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message);
        return;
      }

      setPreview(result.preview);
      setMessage(result.message);
    } catch {
      setMessage("Could not refresh the live preview right now.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function openEditor(streamer: AdminStreamer) {
    setSelected(streamer);
    setDraft(streamer);
    setFieldErrors({});
    setPreview(undefined);
    setMessage("Loading live preview...");
    void refreshPreview(streamer);
  }

  function closeEditor() {
    setSelected(null);
    setDraft(null);
    setPreview(undefined);
    setFieldErrors({});
    setMessage(null);
  }

  async function handleSave() {
    if (!selected?.databaseId || !draft) {
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const response = await fetch(`/api/admin/streamers/${selected.databaseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamer: draft,
        }),
      });
      const result = (await response.json()) as AdminStreamerMutationResponse<AdminStreamer>;

      if (!response.ok || !result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setPreview(result.preview ?? preview);
        setMessage(result.message);
        return;
      }

      if (result.streamer) {
        const savedStreamer = result.streamer;

        setStreamers((current) =>
          sortStreamers(current.map((item) => (item.databaseId === savedStreamer.databaseId ? savedStreamer : item))),
        );
        setSelected(savedStreamer);
        setDraft(savedStreamer);
      }

      setPreview(result.preview);
      setBanner(result.message);
      setMessage(result.message);
      router.refresh();
    } catch {
      setMessage("Could not save streamer changes right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected?.databaseId || isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Delete streamer "${selected.displayName}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/streamers/${selected.databaseId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as AdminStreamerDeleteResponse<AdminStreamer>;

      if (!response.ok || !result.ok) {
        setMessage(result.message);
        return;
      }

      setStreamers((current) => current.filter((item) => item.databaseId !== selected.databaseId));
      setBanner(result.message);
      router.refresh();
      closeEditor();
    } catch {
      setMessage("Could not delete that streamer right now.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {banner ? (
        <div className="mb-5 border border-[#53fc18]/25 bg-[#53fc18]/10 px-4 py-3 text-sm font-bold text-[#baffac]">{banner}</div>
      ) : null}

      <div className="overflow-hidden border border-white/10 bg-[linear-gradient(180deg,_rgba(16,20,25,0.98),_rgba(8,10,13,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#171d23] text-xs font-black uppercase tracking-[0.16em] text-[#9aa3ad]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Platforms</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {streamers.map((streamer) => (
              <tr
                key={streamer.databaseId ?? streamer.id}
                className="cursor-pointer text-[#d6dbe1] transition hover:bg-white/[0.035]"
                onClick={() => openEditor(streamer)}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {streamer.kick?.avatarUrl || streamer.youtube?.avatarUrl ? (
                      <img
                        alt={`${streamer.displayName} avatar`}
                        className="h-11 w-11 border border-white/10 bg-[#0c1116] object-cover"
                        src={streamer.kick?.avatarUrl ?? streamer.youtube?.avatarUrl}
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center border border-white/10 bg-[#0c1116] text-xs font-black text-[#76818d]">XL</div>
                    )}

                    <div>
                      <div className="font-black text-white">{streamer.displayName}</div>
                      <div className="mt-1 text-xs font-semibold text-[#7f8791]">{streamer.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 font-bold">{platformLabels(streamer)}</td>
                <td className="px-4 py-4 font-bold">{streamer.group}</td>
                <td className="px-4 py-4 font-semibold text-[#aeb4bc]">
                  {accountValues(streamer).map((value) => (
                    <div key={value}>{value}</div>
                  ))}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={[
                      "border px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em]",
                      streamer.isActive ? "border-[#53fc18]/25 bg-[#53fc18]/12 text-[#97ff74]" : "border-white/10 bg-white/6 text-[#9aa3ad]",
                    ].join(" ")}
                  >
                    {streamer.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-4 font-semibold text-[#8c949d]">{formatDate(streamer.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && draft ? (
        <AdminModal
          description="Edit the stored streamer record, review the resolved platform accounts, refresh the live snapshot, or delete the record if it should no longer exist."
          eyebrow="Streamer Editor"
          title={selected.displayName}
          onClose={closeEditor}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-[#9ca8b4]">{message ?? "Review the live preview before saving changes."}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="h-11 border border-[#ff4d4d]/25 bg-[#ff4d4d]/10 px-4 text-sm font-black text-[#ffb0b0] transition hover:border-[#ff6c6c]/35 hover:bg-[#ff4d4d]/16 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isDeleting || isSaving || isPreviewing}
                  onClick={() => void handleDelete()}
                >
                  {isDeleting ? "Deleting" : "Delete streamer"}
                </button>
                <button
                  className="h-11 border border-white/12 bg-white/5 px-4 text-sm font-black text-[#dce2e8] transition hover:border-white/22 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isPreviewing || isSaving || isDeleting}
                  onClick={() => void refreshPreview(draft)}
                >
                  {isPreviewing ? "Refreshing preview" : "Refresh preview"}
                </button>
                <button
                  className="h-11 bg-[#53fc18] px-5 text-sm font-black text-black transition hover:bg-[#7cff4c] disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isSaving || isPreviewing || isDeleting}
                  onClick={() => void handleSave()}
                >
                  {isSaving ? "Saving" : "Save streamer"}
                </button>
              </div>
            </div>
          }
        >
          <AdminStreamerEditor
            disabled={isSaving || isDeleting}
            fieldErrors={fieldErrors}
            form={draft}
            preview={preview}
            onChange={(value) => {
              setDraft(value);
              setFieldErrors({});
            }}
          />
        </AdminModal>
      ) : null}
    </>
  );
}
