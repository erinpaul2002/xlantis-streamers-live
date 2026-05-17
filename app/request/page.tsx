import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { StreamerRequestForm } from "@/components/streamer-request-form";

export const metadata = {
  title: "Request a Streamer | Xlantis Live",
};

export default function RequestStreamerPage() {
  return (
    <main className="min-h-screen bg-[#080a0d] text-white">
      <PublicSiteHeader
        title="Xlantis Live"
        subtitle="Streamer requests"
        compact
        containerClassName="max-w-4xl"
        action={
          <div className="flex justify-start lg:justify-end">
            <Link
              className="grid h-11 min-w-28 place-items-center rounded-md bg-[#1a1f25] px-4 text-sm font-black text-[#d6dbe1] transition hover:bg-[#262d35] hover:text-white"
              href="/"
            >
              Back
            </Link>
          </div>
        }
      />

      <section className="mx-auto grid max-w-4xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="border-b border-white/10 pb-6">
          <p className="text-sm font-black uppercase tracking-normal text-[#53fc18]">Community queue</p>
          <h2 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-5xl">Request a streamer</h2>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-[#9aa3ad]">
            Share the streamer name and whichever channel URL you have. One URL is enough.
          </p>
        </div>

        <StreamerRequestForm />
      </section>
    </main>
  );
}
