"use client";

import { useEffect } from "react";
import type { Platform } from "@/types/streamer";

export type PlatformChooserOption = {
  platform: Platform;
  href: string;
  statusLabel: string;
  helperLabel: string;
};

type PlatformChooserModalProps = {
  streamerName: string;
  options: PlatformChooserOption[];
  onClose: () => void;
};

function platformLabel(platform: Platform) {
  return platform === "kick" ? "Kick" : "YouTube";
}

export function PlatformChooserModal({ streamerName, options, onClose }: PlatformChooserModalProps) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040608]/84 p-4 backdrop-blur-md sm:p-6">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(83,252,24,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(255,59,59,0.14),_transparent_30%),linear-gradient(180deg,_rgba(17,22,28,0.98)_0%,_rgba(8,10,13,0.98)_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="border-b border-white/10 bg-black/18 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8dff63]">Choose destination</div>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-[2rem]">{streamerName}</h2>
              <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-[#9ba4ae]">
                Pick the platform you want to follow. Each option opens in a new tab.
              </p>
            </div>

            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/6 text-xs font-black uppercase tracking-[0.16em] text-[#d8dde3] transition hover:border-white/24 hover:bg-white/10 hover:text-white"
              type="button"
              onClick={onClose}
              aria-label="Close chooser"
            >
              X
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:px-7 sm:py-6">
          {options.map((option) => (
            <a
              key={option.platform}
              className="group rounded-[22px] border border-white/10 bg-white/[0.035] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/20"
              href={option.href}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
                        option.platform === "kick"
                          ? "bg-[#53fc18]/16 text-[#8dff63]"
                          : "bg-[#ff3030]/16 text-[#ff8b8b]",
                      ].join(" ")}
                    >
                      {platformLabel(option.platform)}
                    </span>
                    <span className="text-sm font-bold text-white">{option.statusLabel}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#8e98a3]">{option.helperLabel}</div>
                </div>

                <span className="pt-0.5 text-xs font-black uppercase tracking-[0.16em] text-[#d8dde3] transition group-hover:text-white">
                  Open
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
