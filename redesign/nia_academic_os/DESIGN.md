---
name: Nia Academic OS
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#45464c'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#575e70'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2b'
  on-primary-container: '#7d8497'
  inverse-primary: '#c0c6db'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#99efe5'
  on-secondary-container: '#006f67'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#40000c'
  on-tertiary-container: '#f83256'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce2f7'
  primary-fixed-dim: '#c0c6db'
  on-primary-fixed: '#141b2b'
  on-primary-fixed-variant: '#404758'
  secondary-fixed: '#9cf2e8'
  secondary-fixed-dim: '#80d5cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.015em
  title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  stat-numeric:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-3xs: 0.125rem
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  margin-mobile: 1.25rem
  margin-desktop: 3rem
  gutter-default: 1rem
---

## Brand & Style

This design system embodies the intersection of high-performance product execution and understated academic luxury. Designed for students, researchers, and fellows balancing intensive academic demands, it replaces chaotic campus portals and gamified task managers with the poise of an executive fintech terminal or bespoke time-architecture tool.

### Design Philosophy
- **Executive Restraint:** The interface never yells. Visual noise is treated as cognitive debt. The layout relies on spacious canvas areas, optical precision, and razor-sharp typographic scale rather than decorative illustrations or heavy containers.
- **Fintech & Haute Horlogerie Influence:** Micro-interactions mimic the precision mechanics of Cron, Linear, and luxury operating systems. Statuses, times, and grades are treated like precision telemetry.
- **Calm Mastery:** Color is deployable only as semantic intelligence—a single muted eucalyptus pip denotes a thesis completed; an ember terracotta dot highlights an approaching drop deadline. The default visual state remains balanced, quiet, and porcelain-toned.

## Colors

The chromatic architecture rests on a quiet foundation of chalk porcelain and deep obsidian, punctuated strictly by muted, botanical greens and measured coral accents.

### Palette Application
- **Primary (`#111827`):** Obsidian Ink. Serves as the bedrock for high-contrast headlines, primary interactive states, dark mode active surfaces, and micro-metric displays.
- **Secondary (`#0F766E`):** Muted Eucalyptus. Represents academic mastery, verified submissions, GPA metrics, deep work blocks, and calm progress indicators. Never neon or electric.
- **Tertiary (`#E11D48`):** Terracotta Ember. Communicates imminent submission deadlines, high-priority syllabus flags, and critical exam countdowns with editorial urgency rather than panic.
- **Neutral Canvas (`#F4F4F6` / `#FAFAFA`):** Warm Porcelain and Pale Chalk. Avoids cold clinical blues in favor of warm, museum-grade paper whites that reduce ocular strain during extended library sessions.
- **Hairline Dividers (`#E5E5EB`):** Muted aluminum borders rendered at 0.5px to 1px opacity scales (`rgba(229, 229, 235, 0.6)`).

## Typography

Inter provides a pristine, neutral, and highly engineered typographic engine. The layout relies on strict vertical tracking adjustments to deliver an authoritative Apple/Fintech quality.

### Typographic Rules
- **Negative Kerning for Scale:** Any headline over 20px utilizes aggressive negative letter-spacing (`-0.015em` to `-0.03em`) to bind characters together in a tight, editorial lockup.
- **Monospace Micro-Labels:** `label-caps` must always be rendered in full uppercase with expanded letter-spacing (`+0.08em`) to delineate module categories (e.g., `SEMESTER II • MODULE 402`, `DUE IN 2H 14M`).
- **Tabular Figures:** All numeric displays (timestamps, GPAs, credit tallies, countdowns) enforce tabular lining figures (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during real-time updates.

## Layout & Spacing

The layout philosophy balances a disciplined 8pt grid with expansive breathing margins.

### Layout Grid Model
- **Mobile (< 768px):** Single-column stack with dynamic safe area insets. Fixed lateral margins of `1.25rem` (20px). Modules nest inside continuous cards with `0.75rem` vertical separation.
- **Desktop / Tablet Landscape (≥ 1024px):** 12-column fluid grid locked inside a max-width container of `1280px`. Left-aligned persistent navigation rail (64px collapsed, 240px expanded), flanked by a dual-pane calendar and workspace split.
- **Vertical Rhythm:** Macro-sections maintain a minimum spacing of `2rem` to `3rem`. Inner card paddings strictly observe `1.25rem` to `1.5rem`, ensuring that dense analytical data retains clarity.

## Elevation & Depth

Depth is established not through heavy skeuomorphic drop shadows, but through luminous surface translucency, hairline optical borders, and faint atmospheric ambient falloffs.

### Depth Hierarchy
- **Canvas Base:** Pure chalk/porcelain background (`#FAFAFA`).
- **Surface Elevation 1 (Cards, Modules):** `#FFFFFF` with a 1px composite outline (`rgba(17, 24, 39, 0.06)` or `rgba(229, 229, 235, 0.7)`) accompanied by an ambient micro-shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.02), 0 4px 12px 0 rgba(0, 0, 0, 0.03)`.
- **Surface Elevation 2 (Floating Floating Nav, Menus, Modals):** Frosted glass formulation: `backdrop-filter: blur(20px) saturate(180%)`, background fill of `rgba(255, 255, 255, 0.82)`, bordered with a refined inset highlight of `rgba(255, 255, 255, 0.4)` atop a subtle shadow `0 12px 32px -4px rgba(15, 23, 42, 0.06)`.
- **Dark Mode Adjustment:** Transparent obsidian surfaces (`rgba(24, 24, 27, 0.7)`) backed by `1px solid rgba(255, 255, 255, 0.08)` to outline edges cleanly against absolute black canvases.

## Shapes

The interface embraces a tailored Apple-style curvature: generous squircle silhouettes for primary containment cards, matched with balanced inner elements.

### Curvature Taxonomy
- **Primary Modules & Dashboards:** `rounded-2xl` (16px) to `rounded-3xl` (24px) for expansive cards, syllabus overviews, and modal dialogs.
- **Micro Elements & Badges:** Continuous pill shapes (`rounded-full`) for status indicators, tag labels, floating pills, and action chips.
- **Form Controls & Inner Cells:** `rounded-xl` (12px) for segmented tab controls, text input fields, and individual agenda time slots to nest proportionately inside parent containers without visual clash.

## Components

### Buttons
- **Primary Action:** Solid obsidian (`#111827`) fill, crisp pure white typography, `rounded-full` or `rounded-xl` with micro-height (36px–40px). Minimal padding (horizontal: 16px), subtle inward press transition (`active:scale-[0.98]`).
- **Secondary / Ghost:** Transparent background, hairline border (`1px solid #E5E5EB`), obsidian text, subtle hover lift to `#F4F4F6`.
- **Destructive / Urgent:** Soft terracotta tint fill (`rgba(225, 29, 72, 0.08)`), text `#E11D48`, hairline border `rgba(225, 29, 72, 0.15)`.

### Elevated Cards & Modules
- Single-pixel border bounding pure white paper fills.
- Top micro-headers featuring `label-caps` typography, metadata inline (e.g., credit count or room number), separated by an ultra-faint rule.
- No heavy accent banners across card tops; colored categorization exists strictly as a 6px status bead or delicate typography tint.

### Status Chips & Badges
- Continuous pill geometry (`rounded-full`), height: 22px, padding: 2px 10px.
- **Academic Success / Active:** `#0F766E` text atop `rgba(15, 118, 110, 0.08)` background.
- **Deadline Critical:** `#E11D48` text atop `rgba(225, 29, 72, 0.08)` background.
- **Neutral / Lecture Tag:** Obsidian text atop `#F4F4F6`.

### Segmented Controls
- Contained within an encased chalk pill background (`#F4F4F6`), 4px interior inset padding.
- Selected state: Pure white floating segment with high-precision soft shadow (`0 1px 3px rgba(0, 0, 0, 0.08)`), matching the corner radius proportionally (`rounded-lg`).

### Form Inputs & Text Fields
- Clean background in `#FAFAFA` transitioning to pure `#FFFFFF` on focus.
- 1px hairline border in `#E5E5EB`, shifting to obsidian `#111827` without aggressive glow halos—relying instead on a discrete 1px ring offset.

### Floating Bottom Dock / Navigation
- Fixed floating bar suspended 24px above mobile viewports or centered in tablet views.
- Frosted glass finish (`rgba(255, 255, 255, 0.85)` with `blur(20px)`).
- Enclosed with a hairline outline, containing micro-iconography (18px) and tactile, minimal active pips underneath current views.