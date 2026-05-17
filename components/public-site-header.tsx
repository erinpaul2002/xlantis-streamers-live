import Image from "next/image";
import Link from "next/link";
import { MobileInstallCta } from "@/components/mobile-install-cta";

type PublicSiteHeaderProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  mobileTopAction?: React.ReactNode;
  children?: React.ReactNode;
  sticky?: boolean;
  compact?: boolean;
  collapsed?: boolean;
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
  mobileTopAction,
  children,
  sticky = false,
  compact = false,
  collapsed = false,
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
      <div
        className={[
          `mx-auto flex flex-col px-4 sm:px-6 lg:px-8 ${containerClassName}`,
          collapsed ? "gap-2 py-2 sm:gap-3 sm:py-3" : "gap-3 py-3 sm:gap-4 sm:py-4",
        ].join(" ")}
      >
        <MobileInstallCta />

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3 sm:gap-4" href={brandHref}>
              <div
                className={[
                  "flex shrink-0 items-center justify-center",
                  collapsed
                    ? compact
                      ? "h-8 w-22 sm:h-12 sm:w-36"
                      : "h-9 w-24 sm:h-14 sm:w-42"
                    : compact
                      ? "h-10 w-28 sm:h-14 sm:w-40"
                      : "h-11 w-30 sm:h-16 sm:w-48",
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
                <h1
                  className={[
                    "truncate font-black tracking-normal text-white",
                    collapsed ? "text-base sm:text-xl" : "text-lg sm:text-2xl",
                  ].join(" ")}
                >
                  {title}
                </h1>
                <p
                  className={[
                    "line-clamp-1 font-semibold text-[#7f8791] sm:mt-1 sm:text-sm",
                    collapsed ? "hidden sm:block sm:text-xs" : "mt-0.5 text-xs",
                  ].join(" ")}
                >
                  {subtitle}
                </p>
              </div>
            </Link>

            {mobileTopAction ? <div className="flex shrink-0 sm:hidden">{mobileTopAction}</div> : null}
          </div>

          {action ? <div className="w-full lg:w-auto">{action}</div> : null}
        </div>

        {children ? (
          <div
            className={[
              "overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out",
              collapsed ? "pointer-events-none -mt-1 max-h-0 opacity-0" : "max-h-64 opacity-100",
            ].join(" ")}
          >
            {children}
          </div>
        ) : null}
      </div>
    </header>
  );
}
