"use client";

import Loading1 from "@/components/loading/Loading1";
import Loading3 from "@/components/loading/Loading3";
import Loading4 from "@/components/loading/Loading4";
import Loading7 from "@/components/loading/Loading7";
import Loading8 from "@/components/loading/Loading8";
import Loading9 from "@/components/loading/Loading9";
import Loading10 from "@/components/loading/Loading10";
import type { LoadingScreenProps } from "@/components/loading/loading-screen-types";
import {
  getResolvedLoadingScreenId,
  type LoadingScreenId,
} from "@/components/loading/loading-screen-ids";
import { useIsMobileLoadingViewport } from "@/components/loading/loading-screen-device";

type LoadingScreenRendererProps = LoadingScreenProps & {
  animationId: LoadingScreenId;
};

export function LoadingScreenRenderer({
  animationId,
  phase = "loading",
}: LoadingScreenRendererProps) {
  const isMobileViewport = useIsMobileLoadingViewport();
  const resolvedAnimationId = getResolvedLoadingScreenId(animationId, isMobileViewport);

  switch (resolvedAnimationId) {
    case 1:
      return <Loading1 phase={phase} />;
    case 3:
      return <Loading3 phase={phase} />;
    case 4:
      return <Loading4 phase={phase} />;
    case 7:
      return <Loading7 phase={phase} />;
    case 8:
      return <Loading8 phase={phase} />;
    case 9:
      return <Loading9 phase={phase} />;
    case 10:
      return <Loading10 phase={phase} />;
    default:
      return <Loading1 phase={phase} />;
  }
}
