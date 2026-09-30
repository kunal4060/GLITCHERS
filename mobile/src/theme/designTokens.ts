// NIA Academic OS — Design System Tokens
// Palette: porcelain canvas, obsidian ink, muted eucalyptus, terracotta ember.
// All legacy token NAMES are preserved so existing screens keep compiling;
// their values are remapped to the new palette.

export const designTokens = {
  colors: {
    // Porcelain Canvas
    background: '#f9f9fb',
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSecondary: '#f3f3f5',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#eeeef0',
    surfaceBorder: '#E5E5EB',
    surfaceBorderActive: '#0F766E',

    // Primary (Obsidian — primary actions, headlines)
    primary: '#111827',
    primaryDark: '#0B0F16',
    primaryMuted: '#374151',
    primaryLight: '#6B7280',
    primarySoft: '#F3F4F6', // Soft neutral for cards
    primaryPill: '#111827', // Active tab pill
    primaryDeep: '#111827', // Dark card end
    primaryGlow: 'rgba(17, 24, 39, 0.08)',
    primarySubtle: 'rgba(17, 24, 39, 0.06)',

    // Urgent / Ember Accents (Terracotta)
    accentPeach: '#E11D48',
    accentPeachDeep: '#BE123C',
    accentPeachDot: '#E11D48', // Notification dot & status dot
    accentPeachCard: 'rgba(225, 29, 72, 0.08)', // Urgent card tint
    accentCream: '#f9f9fb',
    accentSand: '#eeeef0',
    accentSage: '#0F766E',
    accentWine: '#920028', // EXTREMELY_IMPORTANT deep badge

    // AI Visual Identity (NIA)
    aiPrimary: '#0F766E',
    aiSecondary: '#E11D48',
    aiGlow: 'rgba(15, 118, 110, 0.15)',
    aiSubtle: 'rgba(15, 118, 110, 0.08)',
    aiBorder: 'rgba(15, 118, 110, 0.25)',

    // Semantic Accents (Muted, Academic, Non-Neon)
    success: '#0F766E',
    successSoft: 'rgba(15, 118, 110, 0.10)',
    warning: '#B45309',
    warningSoft: 'rgba(180, 83, 9, 0.08)',
    danger: '#E11D48',
    dangerSoft: 'rgba(225, 29, 72, 0.08)',

    // Typography Hierarchy
    textPrimary: '#1a1c1d', // Obsidian ink
    textSecondary: '#45464c',
    textMuted: '#76777d', // Subtle metadata
    textSubtle: '#A7ABB3',
    textLight: '#FFFFFF', // High-contrast text on dark surfaces
    textPeach: '#FDA4AF', // Light ember label on dark cards

    // Specific Badges
    cgpaBadge: '#D97706',
    creditsBadge: '#4F46E5',

    // --- New NIA design-system tokens ---
    obsidian: '#111827',
    ink: '#1a1c1d',
    porcelain: '#f9f9fb',
    hairline: '#E5E5EB',
    eucalyptus: '#0F766E',
    eucalyptusDeep: '#006a63',
    eucalyptusSoft: 'rgba(15, 118, 110, 0.08)',
    eucalyptusFaint: 'rgba(15, 118, 110, 0.05)',
    terracotta: '#E11D48',
    terracottaDeep: '#BE123C',
    terracottaSoft: 'rgba(225, 29, 72, 0.08)',
    darkCard: '#141b2b', // Dark telemetry card
    darkCardSoft: '#1E293B',
    dock: 'rgba(255, 255, 255, 0.88)', // Floating frosted dock fill
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

  // Radii Tokens
  radii: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    card: 20,
    pill: 999,
  },

  // Typography Hierarchy (system font approximating Inter)
  typography: {
    hero: { fontSize: 24, fontWeight: '700' as const, color: '#1a1c1d', letterSpacing: -0.4 },
    displayNumber: { fontSize: 28, fontWeight: '700' as const, color: '#1a1c1d', letterSpacing: -0.5 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#1a1c1d', letterSpacing: -0.2 },
    cardTitle: { fontSize: 15, fontWeight: '600' as const, color: '#1a1c1d' },
    body: { fontSize: 13, fontWeight: '400' as const, color: '#45464c', lineHeight: 18 },
    bodyMedium: { fontSize: 13, fontWeight: '500' as const, color: '#1a1c1d' },
    label: { fontSize: 11, fontWeight: '700' as const, color: '#76777d', textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    micro: { fontSize: 11, fontWeight: '500' as const, color: '#76777d' },
    // 10px uppercase micro-labels with +0.08em tracking (label-caps)
    labelCaps: { fontSize: 10, fontWeight: '600' as const, color: '#76777d', letterSpacing: 0.8, textTransform: 'uppercase' as const },
    statNumeric: { fontSize: 22, fontWeight: '700' as const, color: '#1a1c1d', letterSpacing: -0.4 },
  },

  // Soft Shadows
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};
