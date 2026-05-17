import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStreamersManager } from "@/components/admin-streamers-manager";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminStreamers, type AdminStreamer } from "@/lib/db/streamers";

export const metadata = {
  title: "Admin Streamers | Xlantis Live",
};

export const dynamic = "force-dynamic";

export default async function AdminStreamersPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  let streamers: AdminStreamer[] = [];
  let loadError: string | null = null;

  try {
    streamers = await getAdminStreamers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load streamers.";
  }

  const activeCount = streamers.filter((streamer) => streamer.isActive).length;

  return (
    <main className="min-h-screen bg-[#080a0d] text-white">
      <header className="border-b border-white/8 bg-[#080a0d]/92">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#53fc18] text-lg font-black text-black">
                XL
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-black text-white">Xlantis Admin</div>
                <div className="truncate text-xs font-bold text-[#7f8791]">
                  {activeCount} active of {streamers.length} streamers
                </div>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              <Link className="rounded-md bg-white px-3 py-2 text-sm font-black text-black" href="/admin/streamers">
                Streamers
              </Link>
              <Link
                className="rounded-md bg-[#1a1f25] px-3 py-2 text-sm font-black text-[#d6dbe1] transition hover:bg-[#262d35] hover:text-white"
                href="/admin/requests"
              >
                Requests
              </Link>
              <form action="/admin/logout" method="post">
                <button
                  className="rounded-md bg-[#1a1f25] px-3 py-2 text-sm font-black text-[#d6dbe1] transition hover:bg-[#262d35] hover:text-white"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 border-b border-white/10 pb-5">
          <p className="text-sm font-black uppercase tracking-normal text-[#53fc18]">Convex database</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-white">Added streamers</h1>
        </div>

        {loadError ? (
          <div className="rounded-md border border-[#ff3030]/30 bg-[#ff3030]/10 px-4 py-3 text-sm font-bold text-[#ff9a9a]">
            {loadError}
          </div>
        ) : null}

        {!loadError && !streamers.length ? (
          <div className="rounded-lg border border-white/10 bg-[#101419] px-5 py-8 text-center">
            <h2 className="text-xl font-black text-white">No streamers found in Convex</h2>
            <p className="mt-2 text-sm font-semibold text-[#8c949d]">
              Add streamer records in Convex to populate the public dashboard.
            </p>
          </div>
        ) : null}

        {streamers.length ? <AdminStreamersManager initialStreamers={streamers} /> : null}
      </section>
    </main>
  );
}
