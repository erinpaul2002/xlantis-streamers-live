import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "i.ytimg.com",
  "yt3.ggpht.com",
  "yt4.ggpht.com",
  "yt3.googleusercontent.com",
  "images.kick.com",
  "files.kick.com",
  "files.kick.com.co",
]);

function isAllowedUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");

  if (!sourceUrl || !isAllowedUrl(sourceUrl)) {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "XlantisLive/1.0",
    },
    next: {
      revalidate: 3600,
    },
  });

  if (!response.ok || !response.body) {
    return new NextResponse("Image unavailable", { status: 502 });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
    },
  });
}
