"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { StreamerRequestInput, StreamerRequestResponse } from "@/types/streamer-request";

const initialForm: StreamerRequestInput = {
  streamerName: "",
  kickUrl: "",
  youtubeUrl: "",
};

type FieldErrors = Partial<Record<keyof StreamerRequestInput, string>>;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-xs font-bold text-[#ff8f8f]">{message}</p>;
}

export function StreamerRequestForm() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [form, setForm] = useState<StreamerRequestInput>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof StreamerRequestInput>(key: Key, value: StreamerRequestInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOnline) {
      setStatus({ kind: "error", message: "You're offline. Reconnect before submitting a streamer request." });
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setStatus(null);

    try {
      const response = await fetch("/api/streamer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as StreamerRequestResponse;

      if (!response.ok || !result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setStatus({ kind: "error", message: result.message });
        return;
      }

      setForm(initialForm);
      setStatus({ kind: "success", message: result.message });
      router.push("/");
    } catch {
      setStatus({ kind: "error", message: "The request could not be submitted right now." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-5 rounded-lg border border-white/10 bg-[#101419] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] sm:p-6"
      onSubmit={handleSubmit}
    >
      <label className="block">
        <span className="text-xs font-black uppercase tracking-normal text-[#9aa3ad]">Streamer name</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-white/16 bg-[#080a0d] px-4 text-base font-bold text-white outline-none transition placeholder:text-[#67707a] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20"
          placeholder="Name shown on stream"
          value={form.streamerName}
          onChange={(event) => updateField("streamerName", event.target.value)}
        />
        <FieldError message={fieldErrors.streamerName} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-normal text-[#9aa3ad]">Kick URL</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-white/16 bg-[#080a0d] px-4 text-base font-bold text-white outline-none transition placeholder:text-[#67707a] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20"
            placeholder="https://kick.com/streamer"
            value={form.kickUrl}
            onChange={(event) => updateField("kickUrl", event.target.value)}
          />
          <FieldError message={fieldErrors.kickUrl} />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-normal text-[#9aa3ad]">YouTube URL</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-white/16 bg-[#080a0d] px-4 text-base font-bold text-white outline-none transition placeholder:text-[#67707a] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20"
            placeholder="https://www.youtube.com/@streamer"
            value={form.youtubeUrl}
            onChange={(event) => updateField("youtubeUrl", event.target.value)}
          />
          <FieldError message={fieldErrors.youtubeUrl} />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {status ? (
          <div
            className={[
              "rounded-md px-3 py-2 text-sm font-bold",
              status.kind === "success" ? "bg-[#53fc18]/12 text-[#8dff63]" : "bg-[#ff3030]/12 text-[#ff8888]",
            ].join(" ")}
          >
            {status.message}
          </div>
        ) : (
          <div className={`text-sm font-semibold ${isOnline ? "text-[#7f8791]" : "text-[#ffd78f]"}`}>
            {isOnline
              ? "Requests are reviewed before a streamer is added."
              : "You're offline. The form stays available, but requests can only be sent once you're back online."}
          </div>
        )}

        <button
          className="h-11 rounded-md bg-[#53fc18] px-5 text-sm font-black text-black transition hover:bg-[#7cff4c] disabled:cursor-wait disabled:opacity-70"
          type="submit"
          disabled={isSubmitting || !isOnline}
        >
          {isSubmitting ? "Submitting" : isOnline ? "Submit request" : "Offline"}
        </button>
      </div>
    </form>
  );
}
