import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function ensureAdminRequest() {
  if (await isAdminAuthenticated()) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      message: "Authentication required.",
    },
    { status: 401 },
  );
}
