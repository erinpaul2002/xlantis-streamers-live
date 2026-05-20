import type { LoadingScreenId } from "@/components/loading/loading-screen-ids";

export const loadingMinimumDurations: Record<LoadingScreenId, number> = {
  1: 3000,
  3: 2800,
  4: 2400,
  7: 3200,
  8: 3400,
  9: 3400,
  10: 3400,
};

export const loadingRevealDurations: Record<LoadingScreenId, number> = {
  1: 950,
  3: 1100,
  4: 1350,
  7: 1150,
  8: 1050,
  9: 1200,
  10: 1100,
};
