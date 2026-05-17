"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin-modal";
import { AdminStreamerEditor } from "@/components/admin-streamer-editor";
import { buildDefaultStreamerId } from "@/lib/admin-streamer-utils";
import type { AdminStreamer } from "@/lib/db/streamers";
import type {
  AdminStreamerMatchCandidate,
  AdminFieldErrors,
  AdminStreamerMutationResponse,
  AdminStreamerPreview,
  AdminStreamerPreviewResponse,
  PendingRequestCandidate,
} from "@/types/admin-streamer";
import type { StreamerRequest, StreamerRequestDeleteResponse } from "@/types/streamer-request";
import type { Streamer } from "@/types/streamer";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RequestLink({ href }: { href?: string }) {
  if (!href) {
    return <span className="text-[#59616b]">Not provided</span>;
  }

  return (
    <a className="font-bold text-[#8dff63] underline-offset-4 hover:underline" href={href} rel="noreferrer" target="_blank">
      {href}
    </a>
  );
}

function buildInitialDraft(request: StreamerRequest): Streamer {
  return {
    id: buildDefaultStreamerId(request.streamerName, "Others"),
    displayName: request.streamerName,
    group: "Others",
    isActive: true,
  };
}

function describePlatforms(candidate: Pick<AdminStreamerMatchCandidate | PendingRequestCandidate, "platforms">) {
  return candidate.platforms.length ? candidate.platforms.map((platform) => (platform === "kick" ? "Kick" : "YouTube")).join(" + ") : "No accounts";
}

function mergeModeLabel(isMerging: boolean) {
  return isMerging ? "Merging into an existing streamer." : "Creating a brand-new streamer.";
}

export function AdminRequestsManager({ initialRequests }: { initialRequests: StreamerRequest[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selected, setSelected] = useState<StreamerRequest | null>(null);
  const [draft, setDraft] = useState<Streamer | null>(null);
  const [preview, setPreview] = useState<AdminStreamerPreview | undefined>();
  const [fieldErrors, setFieldErrors] = useState<AdminFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<string | undefined>();
  const [selectedHelperRequestIds, setSelectedHelperRequestIds] = useState<string[]>([]);
  const [selectedTargetDatabaseId, setSelectedTargetDatabaseId] = useState<string | undefined>();

  async function processRequest(request: StreamerRequest, targetDatabaseId?: string, helperRequestIds: string[] = selectedHelperRequestIds) {
    setIsProcessing(true);
    setFieldErrors({});
    setMessage("Processing submitted links...");

    try {
      const response = await fetch("/api/admin/streamer-requests/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.databaseId,
          streamerName: request.streamerName,
          kickUrl: request.kickUrl,
          youtubeUrl: request.youtubeUrl,
          selectedHelperRequestIds: helperRequestIds,
          targetDatabaseId,
        }),
      });
      const result = (await response.json()) as AdminStreamerPreviewResponse;

      if (!response.ok || !result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }

      if (result.preview) {
        setPreview(result.preview);
        setDraft(result.preview.draft);
        setFieldErrors(result.preview.fieldErrors ?? {});
        setSelectedHelperRequestIds(result.preview.appliedHelperRequestIds ?? []);
        setSelectedTargetDatabaseId(result.preview.selectedTargetDatabaseId);
      }

      setMessage(result.message);
    } catch {
      setMessage("Could not process those links right now.");
    } finally {
      setIsProcessing(false);
    }
  }

  function openRequest(request: StreamerRequest) {
    setSelected(request);
    setDraft(buildInitialDraft(request));
    setPreview(undefined);
    setFieldErrors({});
    setSelectedHelperRequestIds([]);
    setSelectedTargetDatabaseId(undefined);
    void processRequest(request, undefined);
  }

  function closeRequest() {
    setSelected(null);
    setDraft(null);
    setPreview(undefined);
    setFieldErrors({});
    setMessage(null);
    setSelectedHelperRequestIds([]);
    setSelectedTargetDatabaseId(undefined);
  }

  async function approveRequest() {
    if (!selected?.databaseId || !draft) {
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const response = await fetch("/api/admin/streamer-requests/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: selected.databaseId,
          selectedHelperRequestIds,
          streamer: draft,
          targetDatabaseId: selectedTargetDatabaseId,
        }),
      });
      const result = (await response.json()) as AdminStreamerMutationResponse<AdminStreamer>;

      if (!response.ok || !result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setPreview(
          result.preview
            ? {
                ...result.preview,
                appliedHelperRequestIds: result.preview.appliedHelperRequestIds ?? selectedHelperRequestIds,
                appliedHelperRequestsNote: result.preview.appliedHelperRequestsNote ?? preview?.appliedHelperRequestsNote,
                matchCandidates: result.preview.matchCandidates ?? preview?.matchCandidates,
                pendingRequestCandidates: result.preview.pendingRequestCandidates ?? preview?.pendingRequestCandidates,
                selectedTargetDatabaseId: result.preview.selectedTargetDatabaseId ?? selectedTargetDatabaseId,
                mergeWarning: result.preview.mergeWarning ?? preview?.mergeWarning,
              }
            : preview,
        );
        setMessage(result.message);
        return;
      }

      const deletedIds = new Set(result.deletedRequestIds ?? [selected.databaseId, ...selectedHelperRequestIds]);
      setRequests((current) => current.filter((item) => !item.databaseId || !deletedIds.has(item.databaseId)));
      setBanner(result.message);
      router.refresh();
      closeRequest();
    } catch {
      setMessage("Could not approve that request right now.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRequest(request: StreamerRequest) {
    const requestId = request.databaseId;

    if (!requestId || isDeleting) {
      return;
    }

    const confirmed = window.confirm(`Delete request "${request.streamerName}"?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeletingRequestId(requestId);
    setMessage("Deleting request...");

    try {
      const response = await fetch(`/api/admin/streamer-requests/${requestId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as StreamerRequestDeleteResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message);
        return;
      }

      setRequests((current) => current.filter((item) => item.databaseId !== requestId));
      setBanner(result.message);
      router.refresh();

      if (selected?.databaseId === requestId) {
        closeRequest();
      }
    } catch {
      setMessage("Could not delete that request right now.");
    } finally {
      setIsDeleting(false);
      setDeletingRequestId(undefined);
    }
  }

  function toggleHelperRequest(requestId: string) {
    if (!selected) {
      return;
    }

    const helperIds = selectedHelperRequestIds.includes(requestId)
      ? selectedHelperRequestIds.filter((id) => id !== requestId)
      : [...selectedHelperRequestIds, requestId];

    void processRequest(selected, selectedTargetDatabaseId, helperIds);
  }

  const isMerging = Boolean(selectedTargetDatabaseId);

  return (
    <>
      {banner ? (
        <div className="mb-5 border border-[#53fc18]/25 bg-[#53fc18]/10 px-4 py-3 text-sm font-bold text-[#baffac]">{banner}</div>
      ) : null}

      <div className="overflow-hidden border border-white/10 bg-[linear-gradient(180deg,_rgba(16,20,25,0.98),_rgba(8,10,13,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#171d23] text-xs font-black uppercase tracking-[0.16em] text-[#9aa3ad]">
            <tr>
              <th className="px-4 py-3">Streamer</th>
              <th className="px-4 py-3">Kick URL</th>
              <th className="px-4 py-3">YouTube URL</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {requests.map((request) => (
              <tr key={request.databaseId ?? request.id} className="text-[#d6dbe1]">
                <td className="px-4 py-4">
                  <div className="font-black text-white">{request.streamerName}</div>
                  <div className="mt-1 text-xs font-semibold text-[#7f8791]">{request.databaseId ?? request.id}</div>
                </td>
                <td className="max-w-xs px-4 py-4">
                  <RequestLink href={request.kickUrl} />
                </td>
                <td className="max-w-xs px-4 py-4">
                  <RequestLink href={request.youtubeUrl} />
                </td>
                <td className="px-4 py-4">
                  <span className="border border-[#53fc18]/25 bg-[#53fc18]/14 px-2 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#8dff63]">
                    {request.status ?? "pending"}
                  </span>
                </td>
                <td className="px-4 py-4 font-semibold text-[#8c949d]">{formatDate(request.createdAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="h-10 border border-white/12 bg-white/5 px-4 text-sm font-black text-[#d9e0e7] transition hover:border-[#53fc18]/30 hover:bg-[#53fc18]/10 hover:text-white"
                      type="button"
                      disabled={isDeleting || isSaving || isProcessing}
                      onClick={() => openRequest(request)}
                    >
                      Process
                    </button>
                    <button
                      className="h-10 border border-[#ff4d4d]/25 bg-[#ff4d4d]/10 px-4 text-sm font-black text-[#ffb0b0] transition hover:border-[#ff6c6c]/35 hover:bg-[#ff4d4d]/16 hover:text-white disabled:cursor-wait disabled:opacity-60"
                      type="button"
                      disabled={isDeleting || isSaving || isProcessing}
                      onClick={() => void deleteRequest(request)}
                    >
                      {deletingRequestId === request.databaseId ? "Deleting" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && draft ? (
        <AdminModal
          description={
            isMerging
              ? "Resolve the submitted links, review the merged draft, adjust anything you want, and then update the existing streamer."
              : "Resolve the submitted Kick and YouTube links, review the live preview, adjust any fields you want, and then add the streamer to Convex."
          }
          eyebrow="Request Approval"
          title={selected.streamerName}
          onClose={closeRequest}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-[#9ca8b4]">
                {message ?? "If one platform resolves and the other does not, you can still edit and approve manually."}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="h-11 border border-[#ff4d4d]/25 bg-[#ff4d4d]/10 px-4 text-sm font-black text-[#ffb0b0] transition hover:border-[#ff6c6c]/35 hover:bg-[#ff4d4d]/16 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isDeleting || isSaving || isProcessing}
                  onClick={() => void deleteRequest(selected)}
                >
                  {isDeleting && deletingRequestId === selected.databaseId ? "Deleting request" : "Delete request"}
                </button>
                <button
                  className="h-11 border border-white/12 bg-white/5 px-4 text-sm font-black text-[#dce2e8] transition hover:border-white/22 hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isProcessing || isSaving || isDeleting}
                  onClick={() => void processRequest(selected, selectedTargetDatabaseId)}
                >
                  {isProcessing ? "Processing" : "Process links"}
                </button>
                <button
                  className="h-11 bg-[#53fc18] px-5 text-sm font-black text-black transition hover:bg-[#7cff4c] disabled:cursor-wait disabled:opacity-60"
                  type="button"
                  disabled={isSaving || isProcessing || isDeleting}
                  onClick={() => void approveRequest()}
                >
                  {isSaving ? (isMerging ? "Merging streamer" : "Adding streamer") : isMerging ? "Confirm and merge streamer" : "Confirm and add streamer"}
                </button>
              </div>
            </div>
          }
        >
          <AdminStreamerEditor
            disabled={isSaving || isDeleting}
            fieldErrors={fieldErrors}
            form={draft}
            note={
              <div className="grid gap-4 text-sm">
                <div>Submitted Kick URL: {selected.kickUrl ?? "Not provided"}</div>
                <div>Submitted YouTube URL: {selected.youtubeUrl ?? "Not provided"}</div>
                {preview?.relatedRequestsNote ? (
                  <div className="border border-[#53fc18]/25 bg-[#53fc18]/10 px-3 py-2 font-semibold text-[#baffac]">
                    {preview.relatedRequestsNote}
                  </div>
                ) : null}
                {preview?.appliedHelperRequestsNote ? (
                  <div className="border border-[#53fc18]/25 bg-[#53fc18]/10 px-3 py-2 font-semibold text-[#baffac]">
                    {preview.appliedHelperRequestsNote}
                  </div>
                ) : null}
                {preview?.mergeWarning ? (
                  <div className="border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-3 py-2 font-semibold text-[#ffb0b0]">{preview.mergeWarning}</div>
                ) : null}
                <div className="grid gap-3 border border-white/10 bg-white/5 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-[#9ecb8d]">Possible related pending requests</div>
                    <div className="text-xs font-semibold text-[#93a3b0]">Suggest-only helpers</div>
                  </div>
                  <div className="grid gap-2">
                    {preview?.pendingRequestCandidates?.length ? (
                      preview.pendingRequestCandidates.map((candidate) => {
                        const isApplied = selectedHelperRequestIds.includes(candidate.requestId);

                        return (
                          <div
                            key={candidate.requestId}
                            className={[
                              "border px-3 py-3 transition",
                              isApplied
                                ? "border-[#53fc18]/35 bg-[#53fc18]/12 text-white"
                                : "border-white/10 bg-white/5 text-[#cfd6de]",
                            ].join(" ")}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-black">{candidate.streamerName}</div>
                                <div className="mt-1 text-xs font-semibold text-[#8fa0ad]">{describePlatforms(candidate)}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8dff63]">{candidate.score}</div>
                                <button
                                  className={[
                                    "h-9 border px-3 text-xs font-black transition",
                                    isApplied
                                      ? "border-[#53fc18]/40 bg-[#53fc18]/15 text-white hover:bg-[#53fc18]/24"
                                      : "border-white/12 bg-white/5 text-[#dce2e8] hover:border-white/22 hover:bg-white/10 hover:text-white",
                                  ].join(" ")}
                                  type="button"
                                  disabled={isProcessing || isSaving || isDeleting}
                                  onClick={() => toggleHelperRequest(candidate.requestId)}
                                >
                                  {isApplied ? "Remove helper" : "Use missing account"}
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-[#c5d0d9]">{candidate.reason}</div>
                            <div className="mt-2 text-xs font-semibold text-[#8fa0ad]">
                              Kick URL: {candidate.kickUrl ?? "Not provided"} | YouTube URL: {candidate.youtubeUrl ?? "Not provided"}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="border border-dashed border-white/10 bg-black/10 px-3 py-3 text-xs font-semibold text-[#8fa0ad]">
                        No likely helper requests were found for this draft.
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 border border-white/10 bg-white/5 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-[#9ecb8d]">Merge destination</div>
                    <div className="text-xs font-semibold text-[#93a3b0]">{mergeModeLabel(isMerging)}</div>
                  </div>
                  <div className="grid gap-2">
                    <button
                      className={[
                        "border px-3 py-3 text-left transition",
                        !selectedTargetDatabaseId
                          ? "border-[#53fc18]/35 bg-[#53fc18]/12 text-white"
                          : "border-white/10 bg-white/5 text-[#cfd6de] hover:border-white/18 hover:bg-white/8",
                      ].join(" ")}
                      type="button"
                      disabled={isProcessing || isSaving}
                      onClick={() => void processRequest(selected, undefined, selectedHelperRequestIds)}
                    >
                      <div className="font-black">Create a new streamer</div>
                      <div className="mt-1 text-xs font-semibold text-[#8fa0ad]">Keep this request as a separate streamer record.</div>
                    </button>
                    {preview?.matchCandidates?.length ? (
                      preview.matchCandidates.map((candidate) => {
                        const isSelectedCandidate = candidate.databaseId === selectedTargetDatabaseId;

                        return (
                          <button
                            key={candidate.databaseId ?? candidate.id}
                            className={[
                              "border px-3 py-3 text-left transition",
                              isSelectedCandidate
                                ? "border-[#53fc18]/35 bg-[#53fc18]/12 text-white"
                                : "border-white/10 bg-white/5 text-[#cfd6de] hover:border-white/18 hover:bg-white/8",
                            ].join(" ")}
                            type="button"
                            disabled={isProcessing || isSaving || !candidate.databaseId}
                            onClick={() => void processRequest(selected, candidate.databaseId, selectedHelperRequestIds)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-black">{candidate.displayName}</div>
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8dff63]">{candidate.score}</div>
                            </div>
                            <div className="mt-1 text-xs font-semibold text-[#8fa0ad]">
                              {candidate.group} | {describePlatforms(candidate)}
                            </div>
                            <div className="mt-2 text-xs font-semibold text-[#c5d0d9]">{candidate.reason}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="border border-dashed border-white/10 bg-black/10 px-3 py-3 text-xs font-semibold text-[#8fa0ad]">
                        No close existing streamer suggestions were found for this request yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            }
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
