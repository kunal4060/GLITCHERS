export const designTokens = {
  colors: {
    // Warm Ivory / Off-White Canvas (Reference Source of Truth)
    background: '#F7F4EE',
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2EFE8',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#EDE8DF',
    surfaceBorder: 'rgba(41, 51, 50, 0.07)',
    surfaceBorderActive: '#75A7A5',

    // Primary Palette (Muted Teal / Blue-Green)
    primary: '#75A7A5',
    primaryDark: '#5D8D8B',
    primaryMuted: '#6F9F9D',
    primaryLight: '#86B4B1',
    primarySoft: '#D2E5E3', // Soft mint/teal for cards
    primaryPill: '#BFD9D8', // Active tab pill
    primaryDeep: '#4A6B70', // Hero card gradient end
    primaryGlow: 'rgba(117, 167, 165, 0.15)',
    primarySubtle: 'rgba(117, 167, 165, 0.12)',

    // Secondary Pastel Accents
    accentPeach: '#E8AD8E', // Warm peach / terracotta
    accentPeachDeep: '#C88E72', // Hero card gradient start
    accentPeachDot: '#D4856A', // Notification dot & status dot
    accentPeachCard: '#EEDFD3', // Stat card 2 tint
    accentCream: '#F1E5D5',
    accentSand: '#E3EAE7', // Stat card 3 tint
    accentSage: '#B8C9B9',
    accentWine: '#8A2E3B', // EXTREMELY_IMPORTANT crimson/wine badge

    // AI Visual Identity
    aiPrimary: '#75A7A5',
    aiSecondary: '#D4856A',
    aiGlow: 'rgba(212, 133, 106, 0.20)',
    aiSubtle: 'rgba(117, 167, 165, 0.08)',
    aiBorder: 'rgba(117, 167, 165, 0.25)',

    // Semantic Accents (Muted, Academic, Non-Neon)
    success: '#6B9E82',
    successSoft: '#D6E8DE',
    warning: '#D4856A',
    warningSoft: '#F7E4DC',
    danger: '#8A2E3B',
    dangerSoft: '#F5D7DC',

    // Typography Hierarchy
    textPrimary: '#232D2B', // Dark warm charcoal
    textSecondary: '#6D7470', // Muted gray-green / warm slate
    textMuted: '#8C9692', // Subtle metadata
    textSubtle: '#A2ACA8',
    textLight: '#FFFFFF', // High-contrast text on dark/gradient surfaces
    textPeach: '#F3D7C8', // Hero card "NEXT CLASS" label

    // Specific Badges
    cgpaBadge: '#D4856A',
    creditsBadge: '#75A7A5',
  },

  // Spacing Scale: 4, 8, 12, 16, 20, 24, 32
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  // Radii Tokens (Rounded, Organic, 16-24px mobile standard)
  radii: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    card: 20,
    pill: 999,
  },

  // Typography Hierarchy
  typography: {
    hero: { fontSize: 24, fontWeight: '800' as const, color: '#232D2B', letterSpacing: -0.4 },
    displayNumber: { fontSize: 28, fontWeight: '800' as const, color: '#232D2B', letterSpacing: -0.5 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#232D2B', letterSpacing: -0.2 },
    cardTitle: { fontSize: 15, fontWeight: '700' as const, color: '#232D2B' },
    body: { fontSize: 13, fontWeight: '400' as const, color: '#6D7470', lineHeight: 18 },
    bodyMedium: { fontSize: 13, fontWeight: '500' as const, color: '#232D2B' },
    label: { fontSize: 11, fontWeight: '700' as const, color: '#8C9692', textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    micro: { fontSize: 11, fontWeight: '500' as const, color: '#8C9692' },
  },

  // Soft Warm Shadows
  shadows: {
    card: {
      shadowColor: '#3D352E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    floating: {
      shadowColor: '#3D352E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};
