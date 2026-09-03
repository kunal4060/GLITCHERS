export const designTokens = {
  colors: {
    // Deep obsidian & calm dark navy background surfaces
    background: '#070A10',
    backgroundElevated: '#0D131F',
    surface: '#111827',
    surfaceCard: '#151F32',
    surfaceElevated: '#1A263D',
    surfaceSubtle: '#1F2E49',
    surfaceBorder: '#1E2D44',
    surfaceBorderActive: '#3B82F6',

    // Primary Accents (restrained, deliberate electric blue)
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryGlow: 'rgba(59, 130, 246, 0.15)',
    primarySubtle: 'rgba(59, 130, 246, 0.10)',

    // AI Visual Identity (Violet / Purple Glow)
    aiPrimary: '#8B5CF6',
    aiSecondary: '#A78BFA',
    aiGlow: 'rgba(139, 92, 246, 0.20)',
    aiSubtle: 'rgba(139, 92, 246, 0.08)',
    aiBorder: 'rgba(139, 92, 246, 0.35)',

    // Semantic Accents
    success: '#10B981',
    successGlow: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningGlow: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerGlow: 'rgba(239, 68, 68, 0.15)',

    // Typography
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textSubtle: '#475569',

    // Specific Badges
    cgpaBadge: '#F59E0B',
    creditsBadge: '#2563EB',
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
    xl: 24,
    pill: 999,
  },

  // Typography Hierarchy
  typography: {
    hero: { fontSize: 26, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.5 },
    displayNumber: { fontSize: 32, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: -0.5 },
    sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.2 },
    cardTitle: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF' },
    body: { fontSize: 13, fontWeight: '400' as const, color: '#94A3B8', lineHeight: 18 },
    bodyMedium: { fontSize: 13, fontWeight: '500' as const, color: '#E2E8F0' },
    label: { fontSize: 11, fontWeight: '600' as const, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    micro: { fontSize: 10, fontWeight: '500' as const, color: '#64748B' },
  },

  // Shadows
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
