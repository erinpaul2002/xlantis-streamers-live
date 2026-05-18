export const loadingScreenIds = [1, 3, 4, 7, 8, 9, 10] as const;

export type LoadingScreenId = (typeof loadingScreenIds)[number];

export const mobileLoadingScreenIds: readonly LoadingScreenId[] = [1, 4, 7, 8, 9, 10];

export function getAvailableLoadingScreenIds(isMobileViewport: boolean): readonly LoadingScreenId[] {
  return isMobileViewport ? mobileLoadingScreenIds : loadingScreenIds;
}

export function getResolvedLoadingScreenId(
  animationId: LoadingScreenId,
  isMobileViewport: boolean,
): LoadingScreenId {
  if (isMobileViewport && animationId === 3) {
    return 1;
  }

  return animationId;
}
