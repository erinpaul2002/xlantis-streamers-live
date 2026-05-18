import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppEntryLoader } from "@/components/loading/app-entry-loader";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

export const metadata: Metadata = {
  title: "Xlantis Live",
  description: "Live streamer status dashboard for the Xlantis GTA RP community.",
  applicationName: "Xlantis Live",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xlantis Live",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080a0d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppEntryLoader />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
