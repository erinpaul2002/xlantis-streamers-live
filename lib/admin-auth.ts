import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const ADMIN_COOKIE = "xlantis_admin";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function getAdminToken() {
  const password = getAdminPassword();

  if (!password) {
    return "";
  }

  return createHash("sha256").update(`xlantis-admin:${password}`).digest("hex");
}

function safeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdminPasswordConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(value: string) {
  const password = getAdminPassword();

  return Boolean(password) && safeEquals(value, password);
}

export async function isAdminAuthenticated() {
  const expectedToken = getAdminToken();

  if (!expectedToken) {
    return false;
  }

  const cookieStore = await cookies();
  const actualToken = cookieStore.get(ADMIN_COOKIE)?.value ?? "";

  return safeEquals(actualToken, expectedToken);
}

export function setAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, getAdminToken(), {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
