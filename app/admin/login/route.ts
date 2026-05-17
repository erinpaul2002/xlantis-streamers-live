import { NextResponse } from "next/server";
import { setAdminCookie, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/admin/streamers", request.url), 303);
  setAdminCookie(response);

  return response;
}
