/**
 * Responsive utility hook for ICCP Mobile App
 * Provides device-aware sizing, breakpoints, and adaptive values
 * so all screens render beautifully on every phone/tablet size.
 */
import { useWindowDimensions } from 'react-native';
import { LAYOUT } from './theme';

/** Pre-defined breakpoints */
export const BREAKPOINTS = {
  /** ~320-374px (iPhone SE / small Android) */
  SMALL: 375,
  /** ~375-413px (iPhone standard, Pixel) */
  MEDIUM: 414,
  /** ~414-换行 (Plus/Max phones, foldables) */
  LARGE: 520,
  /** ~520-767px (small tablets / large phones landscape) */
  XLARGE: 768,
  /** ~768px+ (iPad / tablets) */
  TABLET: LAYOUT.tabletBreakpoint,
} as const;

type BreakpointKey = keyof typeof BREAKPOINTS;

/** Normalized scale factor so 1 "unit" = 1 point on a 375-wide reference device. */
function scale(dim: number, reference = 375): number {
  return (dim / reference) * 100;
}

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  const isSmall  = width < BREAKPOINTS.SMALL;
  const isMedium = width >= BREAKPOINTS.SMALL && width < BREAKPOINTS.MEDIUM;
  const isLarge  = width >= BREAKPOINTS.MEDIUM && width < BREAKPOINTS.XLARGE;
  const isTablet = width >= BREAKPOINTS.TABLET;
  const isLandscape = width > height;

  /**
   * Width percentage helpers (0–100)
   * wp(80) → '80%'  → useful for card widths
   */
  const wp = (percent: number) => `${percent}%`;

  /**
   * Proportional width based on screen width.
   * pwp(50) on 375px screen → 187.5 → 187
   * pwp(50) on 414px screen → 207   → 207
   */
  const pwp = (percent: number) => Math.round((width * percent) / 100);

  /**
   * Proportional height (useful for avatars, icons in lists).
   * ph(8) → ~8% of screen height
   */
  const ph = (percent: number) => Math.round((height * percent) / 100);

  /**
   * Scaled spacing/padding — shrinks on small screens, grows on large.
   * Use for gaps, paddings, margins.
   */
  const gap = (base: number) => {
    if (isSmall)  return Math.round(base * 0.75);
    if (isMedium) return Math.round(base * 0.88);
    if (isLarge)  return Math.round(base * 1.0);
    if (isTablet) return Math.round(base * 1.15);
    return base;
  };

  /**
   * Scaled fixed value — consistent scale across all fixed sizes.
   * sz(48) on small → 36, medium → 42, tablet → 55
   */
  const sz = (base: number) => {
    if (isSmall)  return Math.round(base * 0.75);
    if (isMedium) return Math.round(base * 0.88);
    if (isLarge)  return Math.round(base * 1.0);
    if (isTablet) return Math.round(base * 1.15);
    return base;
  };

  /**
   * Scaled font size — slightly smaller on small devices.
   */
  const fs = (base: number) => {
    const scale = fontScale * (isSmall ? 0.88 : isMedium ? 0.95 : isTablet ? 1.05 : 1.0);
    return Math.round(base * scale);
  };

  /**
   * Dynamic icon size.
   */
  const icon = (base: number) => {
    if (isSmall)  return Math.round(base * 0.8);
    if (isTablet) return Math.round(base * 1.2);
    return base;
  };

  /**
   * Avatar size for lists and headers.
   */
  const avatarList  = sz(36);
  const avatarLarge = sz(88);
  const avatarXL    = sz(120);

  /**
   * Button height (standard CTA buttons).
   */
  const btnHeight = sz(48);

  /**
   * Card padding.
   */
  const cardPad = gap(16);

  /**
   * Screen horizontal padding.
   */
  const screenPad = gap(16);

  /**
   * Icon wrap sizes for list items.
   */
  const iconWrapSm = sz(36);
  const iconWrapMd = sz(44);
  const iconWrapLg = sz(48);

  /**
   * Border radius scale.
   */
  const radiusSm  = sz(10);
  const radiusMd  = sz(14);
  const radiusLg  = sz(20);
  const radiusFull = sz(9999);

  /**
   * Dynamic spacing values for common use cases
   */
  const spacing = {
    xs: gap(4),
    sm: gap(8),
    md: gap(12),
    lg: gap(16),
    xl: gap(20),
    xxl: gap(24),
  };

  /**
   * Dynamic padding for screen content
   */
  const contentPadding = gap(16);

  /**
   * Dynamic margin for screen content
   */
  const contentMargin = gap(16);

  /**
   * Safe area top padding (status bar)
   */
  const statusBarPad = sz(48);

  /**
   * Bottom safe area padding (home indicator)
   */
  const bottomPad = sz(24);

  /**
   * Dynamic width for form inputs
   */
  const inputHeight = sz(48);

  /**
   * Dynamic height for buttons
   */
  const buttonHeight = sz(48);

  /**
   * Dynamic width for modals
   */
  const modalWidth = isSmall ? wp(92) : isMedium ? wp(88) : isLarge ? wp(84) : wp(80);

  /**
   * Dynamic font sizes for typography
   */
  const typography = {
    h1: fs(28),
    h2: fs(24),
    h3: fs(20),
    h4: fs(18),
    body: fs(16),
    bodySmall: fs(14),
    caption: fs(12),
    small: fs(11),
  };

  return {
    width,
    height,
    fontScale,
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    isLandscape,
    wp,
    pwp,
    ph,
    gap,
    sz,
    fs,
    icon,
    avatarList,
    avatarLarge,
    avatarXL,
    btnHeight,
    cardPad,
    screenPad,
    iconWrapSm,
    iconWrapMd,
    iconWrapLg,
    radiusSm,
    radiusMd,
    radiusLg,
    radiusFull,
    spacing,
    contentPadding,
    contentMargin,
    statusBarPad,
    bottomPad,
    inputHeight,
    buttonHeight,
    modalWidth,
    typography,
  };
}

export type Responsive = ReturnType<typeof useResponsive>;
