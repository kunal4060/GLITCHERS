// NEXA Theme Gallery — 12 hand-crafted themes.
// Each theme defines a compact semantic palette; buildPalette() expands it
// to the full designTokens.colors shape so all 15+ screens pick it up
// with zero changes (they read designTokens.colors at import time).

export interface ThemeSpec {
  id: string;
  name: string;
  tagline: string;
  dark: boolean;
  preview: [string, string, string]; // 3 dots shown in the picker
  // --- semantic base ---
  bg: string;
  bgElev: string;
  card: string;
  card2: string;
  subtle: string;
  border: string;
  ink: string;
  ink2: string;
  muted: string;
  faint: string;
  onDark: string;
  accent: string;
  accentDeep: string;
  danger: string;
  dangerDeep: string;
  warning: string;
  darkBtn: string;
  darkBtn2: string;
  darkCard: string;
  darkCard2: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Expand a compact spec into the full designTokens.colors shape. */
export function buildPalette(s: ThemeSpec): Record<string, string> {
  const accentSoft = hexToRgba(s.accent, 0.1);
  const accentFaint = hexToRgba(s.accent, 0.05);
  const accentBorder = hexToRgba(s.accent, 0.25);
  const accentGlow = hexToRgba(s.accent, 0.15);
  const dangerSoft = hexToRgba(s.danger, 0.08);
  const warningSoft = hexToRgba(s.warning, 0.1);
  const darkGlow = hexToRgba(s.darkBtn, 0.08);
  return {
    // Surfaces
    background: s.bg,
    backgroundElevated: s.bgElev,
    surface: s.card,
    surfaceSecondary: s.card2,
    surfaceCard: s.card,
    surfaceElevated: s.bgElev,
    surfaceSubtle: s.subtle,
    surfaceBorder: s.border,
    surfaceBorderActive: s.accent,
    // Primary (dark button / headlines)
    primary: s.darkBtn,
    primaryDark: s.darkBtn2,
    primaryMuted: s.ink2,
    primaryLight: s.muted,
    primarySoft: s.subtle,
    primaryPill: s.darkBtn,
    primaryDeep: s.darkBtn2,
    primaryGlow: darkGlow,
    primarySubtle: hexToRgba(s.darkBtn, 0.06),
    // Urgent accents
    accentPeach: s.danger,
    accentPeachDeep: s.dangerDeep,
    accentPeachDot: s.danger,
    accentPeachCard: dangerSoft,
    accentCream: s.bg,
    accentSand: s.subtle,
    accentSage: s.accent,
    accentWine: s.dangerDeep,
    // AI identity
    aiPrimary: s.accent,
    aiSecondary: s.danger,
    aiGlow: accentGlow,
    aiSubtle: accentSoft,
    aiBorder: accentBorder,
    // Semantic
    success: s.accent,
    successSoft: accentSoft,
    warning: s.warning,
    warningSoft,
    danger: s.danger,
    dangerSoft,
    // Typography
    textPrimary: s.ink,
    textSecondary: s.ink2,
    textMuted: s.muted,
    textSubtle: s.faint,
    textLight: s.onDark,
    textPeach: s.danger,
    // Badges
    cgpaBadge: s.warning,
    creditsBadge: s.accent,
    // NIA tokens
    obsidian: s.darkBtn,
    ink: s.ink,
    porcelain: s.bg,
    hairline: s.border,
    eucalyptus: s.accent,
    eucalyptusDeep: s.accentDeep,
    eucalyptusSoft: accentSoft,
    eucalyptusFaint: accentFaint,
    terracotta: s.danger,
    terracottaDeep: s.dangerDeep,
    terracottaSoft: dangerSoft,
    darkCard: s.darkCard,
    darkCardSoft: s.darkCard2,
    dock: hexToRgba(s.card, 0.88),
  };
}

export const THEMES: ThemeSpec[] = [
  {
    id: 'porcelain',
    name: 'Porcelain',
    tagline: 'Classic NEXA light',
    dark: false,
    preview: ['#f9f9fb', '#111827', '#0F766E'],
    bg: '#f9f9fb', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#f3f3f5',
    subtle: '#eeeef0', border: '#E5E5EB',
    ink: '#1a1c1d', ink2: '#45464c', muted: '#76777d', faint: '#A7ABB3',
    onDark: '#FFFFFF',
    accent: '#0F766E', accentDeep: '#006a63',
    danger: '#E11D48', dangerDeep: '#BE123C', warning: '#B45309',
    darkBtn: '#111827', darkBtn2: '#0B0F16',
    darkCard: '#141b2b', darkCard2: '#1E293B',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep navy dark',
    dark: true,
    preview: ['#0A0F1E', '#E8EDF7', '#22D3EE'],
    bg: '#0A0F1E', bgElev: '#111A2E', card: '#131C33', card2: '#0F1730',
    subtle: '#1A2440', border: '#24304F',
    ink: '#E8EDF7', ink2: '#B8C2D9', muted: '#7E8BA6', faint: '#525E78',
    onDark: '#FFFFFF',
    accent: '#22D3EE', accentDeep: '#0E9DB8',
    danger: '#FB4D6D', dangerDeep: '#D92B4F', warning: '#F5A524',
    darkBtn: '#22D3EE', darkBtn2: '#0E9DB8',
    darkCard: '#0D1528', darkCard2: '#16203A',
  },
  {
    id: 'forest',
    name: 'Forest',
    tagline: 'Dark green calm',
    dark: true,
    preview: ['#0C1512', '#EAF5EC', '#4ADE80'],
    bg: '#0C1512', bgElev: '#122019', card: '#14231B', card2: '#101D16',
    subtle: '#1B2E22', border: '#274434',
    ink: '#EAF5EC', ink2: '#B9D4C0', muted: '#7FA08A', faint: '#54685C',
    onDark: '#0C1512',
    accent: '#4ADE80', accentDeep: '#22B45E',
    danger: '#FB7185', dangerDeep: '#D94F63', warning: '#FBBF24',
    darkBtn: '#4ADE80', darkBtn2: '#22B45E',
    darkCard: '#0A120E', darkCard2: '#16241C',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    tagline: 'Warm & energetic',
    dark: false,
    preview: ['#FFF8F0', '#2A1A12', '#EA580C'],
    bg: '#FFF8F0', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#FBF1E6',
    subtle: '#F5E9D9', border: '#EBDCC8',
    ink: '#2A1A12', ink2: '#5C4636', muted: '#8A7360', faint: '#B49F8A',
    onDark: '#FFFFFF',
    accent: '#EA580C', accentDeep: '#C2410C',
    danger: '#DC2626', dangerDeep: '#A81C1C', warning: '#B45309',
    darkBtn: '#2A1A12', darkBtn2: '#1A0F0A',
    darkCard: '#231510', darkCard2: '#332016',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Fresh blue light',
    dark: false,
    preview: ['#F0F9FF', '#0C1A2B', '#0284C7'],
    bg: '#F0F9FF', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#E8F4FD',
    subtle: '#DCEEFB', border: '#CBE3F5',
    ink: '#0C1A2B', ink2: '#33475F', muted: '#64748B', faint: '#94A3B8',
    onDark: '#FFFFFF',
    accent: '#0284C7', accentDeep: '#0369A1',
    danger: '#E11D48', dangerDeep: '#BE123C', warning: '#B45309',
    darkBtn: '#0C1A2B', darkBtn2: '#060D18',
    darkCard: '#0B1E33', darkCard2: '#14304F',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    tagline: 'Soft purple elegance',
    dark: false,
    preview: ['#F5F3FF', '#1E1B2E', '#7C3AED'],
    bg: '#F5F3FF', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#EDE9FE',
    subtle: '#E2DDFB', border: '#D5CFF5',
    ink: '#1E1B2E', ink2: '#453F5E', muted: '#6F6890', faint: '#9A93B5',
    onDark: '#FFFFFF',
    accent: '#7C3AED', accentDeep: '#5B21B6',
    danger: '#E11D48', dangerDeep: '#BE123C', warning: '#B45309',
    darkBtn: '#1E1B2E', darkBtn2: '#12101D',
    darkCard: '#1D1830', darkCard2: '#2B2450',
  },
  {
    id: 'rose',
    name: 'Rosé',
    tagline: 'Blush & bold',
    dark: false,
    preview: ['#FFF1F2', '#2B1218', '#E11D48'],
    bg: '#FFF1F2', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#FBE9EC',
    subtle: '#F6DDE1', border: '#F0CBD2',
    ink: '#2B1218', ink2: '#5E3A42', muted: '#8F6B73', faint: '#B89AA0',
    onDark: '#FFFFFF',
    accent: '#E11D48', accentDeep: '#9F1239',
    danger: '#DC2626', dangerDeep: '#991B1B', warning: '#B45309',
    darkBtn: '#2B1218', darkBtn2: '#1A0B0F',
    darkCard: '#261016', darkCard2: '#3A1B24',
  },
  {
    id: 'mono',
    name: 'Mono',
    tagline: 'Pure black & white',
    dark: false,
    preview: ['#FFFFFF', '#000000', '#000000'],
    bg: '#FFFFFF', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#F5F5F5',
    subtle: '#EBEBEB', border: '#D4D4D4',
    ink: '#000000', ink2: '#333333', muted: '#737373', faint: '#A3A3A3',
    onDark: '#FFFFFF',
    accent: '#000000', accentDeep: '#000000',
    danger: '#000000', dangerDeep: '#000000', warning: '#525252',
    darkBtn: '#000000', darkBtn2: '#000000',
    darkCard: '#0A0A0A', darkCard2: '#1A1A1A',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    tagline: 'True black dark',
    dark: true,
    preview: ['#000000', '#FFFFFF', '#FFFFFF'],
    bg: '#000000', bgElev: '#0A0A0A', card: '#111111', card2: '#0D0D0D',
    subtle: '#1C1C1C', border: '#2A2A2A',
    ink: '#FFFFFF', ink2: '#D4D4D4', muted: '#8A8A8A', faint: '#5C5C5C',
    onDark: '#000000',
    accent: '#FFFFFF', accentDeep: '#D4D4D4',
    danger: '#FF5C5C', dangerDeep: '#D63A3A', warning: '#FFB020',
    darkBtn: '#FFFFFF', darkBtn2: '#D4D4D4',
    darkCard: '#050505', darkCard2: '#141414',
  },
  {
    id: 'desert',
    name: 'Desert',
    tagline: 'Sand & terracotta',
    dark: false,
    preview: ['#FAF6EF', '#2B2118', '#C2410C'],
    bg: '#FAF6EF', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#F3EDE0',
    subtle: '#EAE0CC', border: '#DECFB4',
    ink: '#2B2118', ink2: '#57493A', muted: '#85705C', faint: '#AB9880',
    onDark: '#FFFFFF',
    accent: '#C2410C', accentDeep: '#9A3412',
    danger: '#B91C1C', dangerDeep: '#7F1D1D', warning: '#92400E',
    darkBtn: '#2B2118', darkBtn2: '#1A130D',
    darkCard: '#241A10', darkCard2: '#37271A',
  },
  {
    id: 'royal',
    name: 'Royal',
    tagline: 'Purple & gold dark',
    dark: true,
    preview: ['#150E28', '#F3EDFF', '#F59E0B'],
    bg: '#150E28', bgElev: '#1D1436', card: '#201741', card2: '#1A1233',
    subtle: '#2A2050', border: '#3B2D6B',
    ink: '#F3EDFF', ink2: '#C4B5E8', muted: '#8E7BB8', faint: '#5F548A',
    onDark: '#150E28',
    accent: '#F59E0B', accentDeep: '#D97706',
    danger: '#FB7185', dangerDeep: '#D94F63', warning: '#FBBF24',
    darkBtn: '#F59E0B', darkBtn2: '#D97706',
    darkCard: '#100A20', darkCard2: '#1E1540',
  },
  {
    id: 'mint',
    name: 'Mint',
    tagline: 'Fresh mint light',
    dark: false,
    preview: ['#ECFDF5', '#06281C', '#059669'],
    bg: '#ECFDF5', bgElev: '#FFFFFF', card: '#FFFFFF', card2: '#DDF7E9',
    subtle: '#C9F0DC', border: '#A9E4C6',
    ink: '#06281C', ink2: '#1D4A38', muted: '#4E7A64', faint: '#7FA393',
    onDark: '#FFFFFF',
    accent: '#059669', accentDeep: '#047857',
    danger: '#DC2626', dangerDeep: '#991B1B', warning: '#B45309',
    darkBtn: '#06281C', darkBtn2: '#041A12',
    darkCard: '#07271B', darkCard2: '#0E3A29',
  },
];

export const DEFAULT_THEME_ID = 'porcelain';

export function getTheme(id: string): ThemeSpec {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
