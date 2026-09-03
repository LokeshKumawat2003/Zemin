import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export const BASE_WIDTH = 390;
export const TABLET_BREAKPOINT = 768;
export const WIDE_BREAKPOINT = 700;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = width >= TABLET_BREAKPOINT;
    const isWide = width >= WIDE_BREAKPOINT;
    const scale = Math.min(Math.max(width / BASE_WIDTH, 0.88), isWide ? 1.2 : 1.08);

    const fs = (size: number) => Math.round(size * scale);
    const sp = (size: number) => Math.round(size * scale);
    const wp = (percent: number) => (width * percent) / 100;

    const contentMaxWidth = isTablet ? 720 : width;
    const horizontalPadding = sp(16);
    const gridColumns = isTablet ? 3 : 2;
    const cardGap = sp(8);
    const usableWidth = Math.min(width, contentMaxWidth);
    const cardWidth =
      (usableWidth - horizontalPadding * 2 - cardGap * (gridColumns - 1)) / gridColumns;

    return {
      width,
      height,
      scale,
      fs,
      sp,
      wp,
      isTablet,
      isWide,
      contentMaxWidth,
      horizontalPadding,
      gridColumns,
      cardGap,
      cardWidth,
    };
  }, [width, height]);
}
