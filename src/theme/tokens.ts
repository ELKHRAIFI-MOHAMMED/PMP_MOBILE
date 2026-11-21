import { useColorScheme } from 'react-native';

/**
 * Design tokens — "TrueAi Marchés".
 * Paper / ink / Majorelle, with urgency colours reserved for deadlines and status.
 * Every colour has a light and dark value; screens must read colours from useTheme(), never hardcode.
 */
const light = {
  bg: '#F4F5F2',          // paper
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEE9',
  ink: '#132A2E',         // primary text
  inkSoft: '#4A5D60',     // secondary text (6.9:1 on bg)
  inkFaint: '#5F6F71',    // tertiary / placeholders (≥5:1 on surface)
  line: '#D9DDD5',
  accent: '#4F46C8',      // Majorelle — actions, links, selection
  accentSoft: '#E9E8FA',
  onAccent: '#FFFFFF',
  urgent: '#B3261E',      // deadline ≤ 3 days, errors
  urgentSoft: '#FBE9E7',
  soon: '#8A5A00',        // deadline ≤ 10 days, warnings
  soonSoft: '#FDF1DC',
  ready: '#1F7A55',       // ready / success
  readySoft: '#E3F3EB',
  closed: '#6B7B7D',
  closedSoft: '#ECEEE9',
  scrim: 'rgba(10,20,22,0.5)',
  // Chart marks — validated with the dataviz validator (light band, CVD ΔE ≥ 8 deutan, ≥ 3:1 vs surface).
  chartAccent: '#4F46C8',
  chartGood: '#2A9466',
  chartBad: '#B3261E',
  chartNeutral: '#C3CAC6',
  chartTrack: '#E9E8FA',
};

const dark: typeof light = {
  bg: '#0E1A1C',
  surface: '#16262A',
  surfaceAlt: '#1D3135',
  ink: '#EEF2EF',
  inkSoft: '#B3C0BF',
  inkFaint: '#8A9A99',
  line: '#2A3F43',
  accent: '#A29BFF',
  accentSoft: '#2A2852',
  onAccent: '#14123A',
  urgent: '#FF8A80',
  urgentSoft: '#3A1C1A',
  soon: '#F2C26B',
  soonSoft: '#362A12',
  ready: '#6FD3A5',
  readySoft: '#123327',
  closed: '#8A9A99',
  closedSoft: '#1D3135',
  scrim: 'rgba(0,0,0,0.6)',
  // Dark steps chosen separately (not a flip) and validated against #16262A.
  chartAccent: '#847BEA',
  chartGood: '#3BAA7C',
  chartBad: '#D9473B',
  chartNeutral: '#4A5E62',
  chartTrack: '#2A2852',
};

export type Colors = typeof light;

export const font = {
  regular: 'PublicSans_400Regular',
  medium: 'PublicSans_500Medium',
  semibold: 'PublicSans_600SemiBold',
  bold: 'PublicSans_700Bold',
  heavy: 'PublicSans_800ExtraBold',
} as const;

/** Type scale (pt). Line heights ≈ 1.3–1.45× for sans body text. */
export const type = {
  largeTitle: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 23 },
  callout: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  subhead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  footnote: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
} as const;

/** 4/8 spacing rhythm. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const icon = { sm: 16, md: 20, lg: 24 } as const;
export const touch = 44;

export function useTheme() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? dark : light;
  return { c, dark: scheme === 'dark' };
}
