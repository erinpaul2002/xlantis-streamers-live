"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type AdminModalProps = {
  title: string;
  eyebrow: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function AdminModal({ title, eyebrow, description, onClose, children, footer }: AdminModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030507]/82 p-3 backdrop-blur-sm sm:p-6">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(83,252,24,0.18),_transparent_34%),linear-gradient(180deg,_#131920_0%,_#0a0d10_68%,_#06080b_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
        <div className="border-b border-white/10 bg-black/20 px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8dff63]">{eyebrow}</div>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-[2rem]">{title}</h2>
              {description ? <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#93a0ad]">{description}</p> : null}
            </div>

            <button
              className="grid h-11 w-11 shrink-0 place-items-center border border-white/12 bg-white/5 text-lg font-black text-[#dfe5eb] transition hover:border-white/22 hover:bg-white/10 hover:text-white"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>

        {footer ? <div className="border-t border-white/10 bg-black/20 px-5 py-4 sm:px-7">{footer}</div> : null}
      </div>
    </div>
  );
}
