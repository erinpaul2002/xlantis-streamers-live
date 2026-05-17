import Image from "next/image";
import Link from "next/link";
import { MobileInstallCta } from "@/components/mobile-install-cta";

type PublicSiteHeaderProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  sticky?: boolean;
  compact?: boolean;
  containerClassName?: string;
  brandHref?: string;
  brandImage?: {
    src: string;
    alt: string;
  };
};

const defaultBrandImage = {
  src: "/xlantislogo.png",
  alt: "Xlantis logo",
};

export function PublicSiteHeader({
  title,
  subtitle,
  action,
  children,
  sticky = false,
  compact = false,
  containerClassName = "max-w-[1800px]",
  brandHref = "/",
  brandImage = defaultBrandImage,
}: PublicSiteHeaderProps) {
  return (
    <header
      className={[
        "border-b border-white/8 bg-[#080a0d]/92",
        sticky ? "sticky top-0 z-20 backdrop-blur-xl" : "",
      ].join(" ")}
    >
      <div className={`mx-auto flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 ${containerClassName}`}>
        <MobileInstallCta />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link className="flex min-w-0 items-center gap-4" href={brandHref}>
            <div
              className={[
                "flex shrink-0 items-center justify-center",
                compact ? "h-12 w-32 sm:h-14 sm:w-40" : "h-14 w-36 sm:h-16 sm:w-48",
              ].join(" ")}
            >
              <Image
                src={brandImage.src}
                alt={brandImage.alt}
                width={208}
                height={64}
                className="h-full w-full object-contain"
                priority
              />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-normal text-white sm:text-2xl">{title}</h1>
              <p className="mt-1 text-sm font-semibold text-[#7f8791]">{subtitle}</p>
            </div>
          </Link>

          {action ? <div className="w-full lg:w-auto">{action}</div> : null}
        </div>

        {children}
      </div>
    </header>
  );
}
