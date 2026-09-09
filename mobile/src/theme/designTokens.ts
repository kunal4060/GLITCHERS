export const designTokens = {
  colors: {
    // Nia Academic OS Canvas Tokens (Reference Source of Truth: DESIGN.md)
    background: '#F9F9FB', // Pure porcelain canvas
    surface: '#F9F9FB',
    surfaceDim: '#D9DADC',
    surfaceBright: '#F9F9FB',
    surfaceContainerLowest: '#FFFFFF', // Elevated cards & modules
    surfaceContainerLow: '#F3F3F5',
    surfaceContainer: '#EEEEF0',
    surfaceContainerHigh: '#E8E8EA',
    surfaceContainerHighest: '#E2E2E4',
    backgroundElevated: '#FFFFFF',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSecondary: '#F3F3F5',
    surfaceSubtle: '#EEEEF0',

    // Hairline Optical Borders
    surfaceBorder: 'rgba(26, 28, 29, 0.06)',
    surfaceBorderActive: '#006A63',
    outline: '#76777D',
    outlineVariant: '#C6C6CD',

    // Obsidian Ink (Primary High-Contrast Foundation)
    primary: '#111827', // Obsidian Ink
    primaryContainer: '#141B2B',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#7D8497',
    primaryDark: '#0B0F19',
    primaryMuted: '#2D3748',
    primaryLight: '#374151',
    primarySoft: '#E2E8F0',
    primaryPill: '#111827',
    primaryDeep: '#111827',
    primaryGlow: 'rgba(0, 106, 99, 0.15)',
    primarySubtle: 'rgba(0, 106, 99, 0.08)',

    // Muted Eucalyptus / Academic Teal (Secondary Academic Mastery)
    secondary: '#006A63', // Muted Eucalyptus
    secondaryContainer: '#99EFE5',
    onSecondaryContainer: '#006F67',
    secondaryFixed: '#9CF2E8',
    secondaryFixedDim: '#80D5CB',
    onSecondaryFixed: '#00201D',
    onSecondaryFixedVariant: '#00504A',
    onSecondary: '#FFFFFF',

    // Terracotta Ember / Urgent Priority (Tertiary Alert)
    tertiary: '#BA1A1A', // Terracotta Ember
    tertiaryContainer: '#40000C',
    onTertiaryContainer: '#F83256',
    tertiaryFixed: '#FFDADA',
    tertiaryFixedDim: '#FFB3B6',
    onTertiaryFixedVariant: '#920028',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',

    // Legacy / Pastel Semantic Accents (Aligned with Nia palette)
    accentPeach: '#E8AD8E',
    accentPeachDeep: '#111827',
    accentPeachDot: '#006A63',
    accentPeachCard: '#F3F3F5',
    accentCream: '#F9F9FB',
    accentSand: '#EEEEF0',
    accentSage: '#80D5CB',
    accentWine: '#BA1A1A',

    // AI Visual Identity
    aiPrimary: '#006A63',
    aiSecondary: '#80D5CB',
    aiGlow: 'rgba(0, 106, 99, 0.18)',
    aiSubtle: 'rgba(0, 106, 99, 0.06)',
    aiBorder: 'rgba(0, 106, 99, 0.20)',

    // Semantic States
    success: '#006A63',
    successSoft: '#D8EFEA',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#BA1A1A',
    dangerSoft: '#FFDAD6',

    // Typography Hierarchy
    textPrimary: '#1A1C1D', // High-contrast Charcoal/Obsidian
    textSecondary: '#45464C', // Slate muted secondary
    textMuted: '#76777D', // Subtle metadata
    textSubtle: '#9E9EA4',
    textLight: '#FFFFFF',
    textPeach: '#80D5CB',
    onSurface: '#1A1C1D',
    onSurfaceVariant: '#45464C',

    // Badges
    cgpaBadge: '#D97706',
    creditsBadge: '#006A63',
  },

  // Spacing Scale (8pt disciplined rhythm)
  spacing: {
    space3xs: 2,
    space2xs: 4,
    spaceXs: 8,
    spaceSm: 12,
    spaceMd: 16,
    spaceLg: 24,
    spaceXl: 32,
    space2xl: 48,
    space3xl: 64,
    marginMobile: 20,

    // Legacy keys
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  // Curvature Taxonomy (Apple squircle elegance)
  radii: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    card: 18,
    pill: 9999,
  },

  // Typography Hierarchy (Inter based)
  typography: {
    display: { fontSize: 32, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.8 },
    hero: { fontSize: 24, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.5 },
    displayNumber: { fontSize: 28, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.6 },
    sectionTitle: { fontSize: 16, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.3 },
    cardTitle: { fontSize: 15, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.2 },
    body: { fontSize: 13, fontWeight: '400' as const, color: '#45464C', lineHeight: 18 },
    bodyMedium: { fontSize: 13, fontWeight: '500' as const, color: '#1A1C1D' },
    label: { fontSize: 10, fontWeight: '600' as const, color: '#76777D', textTransform: 'uppercase' as const, letterSpacing: 0.8 },
    labelCaps: { fontSize: 10, fontWeight: '600' as const, color: '#76777D', textTransform: 'uppercase' as const, letterSpacing: 0.8 },
    micro: { fontSize: 11, fontWeight: '500' as const, color: '#76777D' },
    statNumeric: { fontSize: 22, fontWeight: '600' as const, color: '#1A1C1D', letterSpacing: -0.4 },
  },

  // Soft Ambient Shadows & Depth Hierarchy
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
    dock: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 28,
      elevation: 10,
    },
  },
};
