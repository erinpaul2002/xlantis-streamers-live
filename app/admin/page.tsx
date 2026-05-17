import { redirect } from "next/navigation";
import { isAdminAuthenticated, isAdminPasswordConfigured } from "@/lib/admin-auth";

export const metadata = {
  title: "Admin Login | Xlantis Live",
};

export const dynamic = "force-dynamic";

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin/streamers");
  }

  const params = await searchParams;
  const hasError = params?.error === "1";
  const isConfigured = isAdminPasswordConfigured();

  return (
    <main className="grid min-h-screen place-items-center bg-[#080a0d] px-4 py-10 text-white">
      <section className="w-full max-w-md border border-white/12 bg-[#101419] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
        <div className="flex items-center gap-3 border-b border-white/10 pb-5">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-[#53fc18] text-xl font-black text-black">
            XL
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Xlantis Admin</h1>
            <p className="text-sm font-semibold text-[#8c949d]">Streamer database</p>
          </div>
        </div>

        {!isConfigured ? (
          <div className="mt-5 rounded-md border border-[#ff3030]/30 bg-[#ff3030]/10 px-4 py-3 text-sm font-bold text-[#ff9a9a]">
            Set ADMIN_PASSWORD in your .env file before using the admin pages.
          </div>
        ) : null}

        {hasError ? (
          <div className="mt-5 rounded-md border border-[#ff3030]/30 bg-[#ff3030]/10 px-4 py-3 text-sm font-bold text-[#ff9a9a]">
            Password did not match.
          </div>
        ) : null}

        <form action="/admin/login" className="mt-6 grid gap-4" method="post">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-normal text-[#9aa3ad]">Password</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-white/16 bg-[#080a0d] px-4 text-base font-bold text-white outline-none transition placeholder:text-[#67707a] focus:border-[#53fc18] focus:ring-2 focus:ring-[#53fc18]/20"
              name="password"
              placeholder="Admin password"
              type="password"
              disabled={!isConfigured}
            />
          </label>

          <button
            className="h-11 rounded-md bg-[#53fc18] px-5 text-sm font-black text-black transition hover:bg-[#7cff4c] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={!isConfigured}
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
