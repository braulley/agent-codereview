---
name: Telemetry Triage
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#e0c0b1'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#a78b7d'
  outline-variant: '#584237'
  surface-tint: '#ffb690'
  primary: '#ffb690'
  on-primary: '#552100'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#9d4300'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00b07a'
  on-tertiary-container: '#003b26'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 0.75rem
  margin-desktop: 1.25rem
  space-xxs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system establishes a high-density, automated code analysis workstation engineered for senior developers, security researchers, and automated triage agents. The visual language merges brutalist mechanical discipline with the ultra-precise operational efficiency of modern developer tooling.

### Personality & Posture
- **Deterministic & Unforgiving:** Zero decorative filler. Every pixel serves informational bandwidth, visual parsing speed, and instant execution.
- **Instrument-Grade Precision:** Sharp edges, hard 1px structural framing, monospace-anchored alignment, and strict contrast boundaries evoking mission-critical telemetry consoles.
- **High-Velocity Ergonomics:** Designed for continuous keyboard-driven inspection, dense issue scrubbing, instant 1-click remediation, and zero-latency visual prioritization.

### Visual Identity
A hyper-focused brutalist telemetry terminal. All components feature rigid 0-radius geometry, hairline micro-borders, deep carbon and slate dark-matter surfaces, and punchy amber-orange operational beacons against targeted OWASP severity markers.

## Colors

The color architecture is built for extended night-shift triage and high-cognitive-load syntax parsing. Pure white is strictly reserved for critical focus text; structural chrome recedes into deep cold slates to allow severity and diff syntax highlights to direct operator attention immediately.

### Surfaces & Canvas
- **Canvas Base (`#090D16`):** The master ambient abyss. Houses unselected workspace margins and root application framing.
- **Surface Level 1 (`#111827`):** Primary structural surface for sidebar panels, terminal drawers, and code editor backdrops.
- **Surface Level 2 (`#161F30`):** Elevated inspection cards, active tabs, floating diagnostics, and popover overlays.
- **Surface Level 3 (`#1E293B`):** Hover states, active row selections, and interactive hit targets.

### Structural Hairlines
- **Subtle Rim (`#1F2937`):** 1px structural partitions between editor splits and layout frames.
- **Prominent Border (`#2A364F`):** Interactive inputs, active tab indicators, and framed telemetry blocks.

### Tactical Brand & Telemetry Primaries
- **Operational Beacon (`#F97316`):** The primary brand seed color. Denotes system alerts, active triage execution targets, HIGH-severity OWASP findings, and focused states.
- **Telemetry Cyan (`#3B82F6`):** Secondary accent. Drives telemetry links, informational LOW-severity indicators, active Git commit shas, and selector badges.
- **Engine Emerald (`#10B981`):** Tertiary operational state. Directs healthy pipeline validation, clean diff additions, and pristine Code Health status (91–100).

### OWASP Severity Palette (alert gutter / cards)
Severity colors are independent of Code Health score bands.
- **CRITICAL:** Red `#EF4444` with tint background `rgba(239, 68, 68, 0.12)`. Hairline border: `rgba(239, 68, 68, 0.40)`.
- **HIGH:** Pure Brand Orange `#F97316` with tint background `rgba(249, 115, 22, 0.12)`. Hairline border: `rgba(249, 115, 22, 0.40)`.
- **MEDIUM:** Amber `#EAB308` with tint background `rgba(234, 179, 8, 0.12)`. Hairline border: `rgba(234, 179, 8, 0.40)`.
- **LOW:** Sky Cyan `#3B82F6` with tint background `rgba(59, 130, 246, 0.12)`. Hairline border: `rgba(59, 130, 246, 0.35)`.

### Code Health Score Bands (meter only)
- **EXCELLENT (91–100):** Emerald `#10B981` with tint background `rgba(16, 185, 129, 0.12)`. Hairline border: `rgba(16, 185, 129, 0.40)`.
- **GOOD (71–90):** Amber `#EAB308`.
- **ATTENTION (41–70):** Orange `#F97316`.
- **CRITICAL (0–40):** Red `#EF4444`.

## Typography

Typography establishes an instant operational bifurcation between human prose, machine diagnosis, and source code. 

- **Space Grotesk** drives structural titles, system readouts, panel headers, and operational action triggers. Its sharp geometric quirks evoke radar arrays and hardware telemetry.
- **Hanken Grotesk** supplies frictionless, neutral readability for triage explanations, LLM remediation logic, and security rationale.
- **JetBrains Mono** is universally enforced for Monaco editor instances, unified/split diff rows, filepaths, line indices, git commit hashes, and pill badges displaying quantitative telemetry.

All metadata labels and category stamps (`SECURITY`, `PERFORMANCE`, `QUALITY`, `MAINTAINABILITY`) are rendered in uppercase using `label-sm` with widened letter-spacing (`0.08em`) to guarantee quick recognition under high-density scanning.

## Layout & Spacing

The layout is built upon an exhaustive multi-split, high-density telemetry viewport maximizing vertical and horizontal code exposure. It uses a strict 4px base cadence (`0.25rem` steps) to pack maximum actionable information onto a single screen.

### Layout Model
- **Viewport Rigidity:** The app operates primarily as an edge-to-edge application shell (`100vh` locked) with independent scroll panels, rather than a document-scrolling page.
- **Three-Pane Architecture:**
  1. **Left Telemetry Rail (280px–340px):** Code Health gauge, OWASP category filters, issue breakdown list with real-time severity tallies.
  2. **Central Stage (Fluid):** Monaco code engine, dual-view diff canvas (unified/side-by-side), and contextual line-level diagnostic threads.
  3. **Right Action Drawer (320px–420px, collapsable):** AI explanation, AST vulnerability breakdown, and 1-click mutation preview.

### Responsive Breakpoints & Adaptations
- **Desktop (>= 1280px):** Full 3-pane workstation. Simultaneous side-by-side diffing and real-time severity gutter markers.
- **Laptop / Tablet Landscape (1024px - 1279px):** Right Action Drawer collapses into an expandable slide-over drawer; central diff auto-switches to unified mode to retain horizontal line integrity.
- **Mobile / Compact (< 1024px):** Layout reflows into a single tabbed column (`[Telemetry] | [Editor] | [Remediation]`). Code diff gutter indices compact to 2-character widths.

## Elevation & Depth

This system avoids decorative blur layers, soft drop shadows, or floating physics. Depth is communicated strictly via **Tonal Surface Layering** bounded by **Crisp Low-Contrast Hairline Grid Borders**.

### Depth Layers
- **Floor 0 (`#090D16`):** Master screen perimeter, unallocated gutters, terminal background.
- **Layer 1 (`#111827`):** Non-focused card surfaces, quiescent code editor background, inactive input tabs. Separated by `1px solid #1F2937`.
- **Layer 2 (`#161F30`):** Focused card surface, active code line highlights, popover menus, and toolbars. Separated by `1px solid #2A364F`.
- **Overlay Layer 3 (`#1E293B`):** Modal inspector, command palette (Cmd+K), and dropdown menus. Uses an absolute 0px border with an uncompromising mechanical edge: `1px solid #F97316` when active, accompanied by an ultra-crisp directional terminal drop: `4px 4px 0px 0px rgba(0, 0, 0, 0.85)`.

No blur filters (`backdrop-filter`) are permitted; all surfaces must be 100% opaque to prevent frame-rate stuttering during high-frequency syntax streaming.

## Shapes

In strict alignment with brutalist developer console aesthetics, the corner radius across all components is **0px (`roundedness: 0`)**. 

Every boundary—from action buttons, pill badges, and input boxes to modal windows, dropdown lists, and the Monaco diff splitters—terminates at sharp 90-degree right angles. 

This creates uninterrupted visual tracks, reinforces the feeling of raw silicon telemetry, and maximizes display area down to the absolute corner pixel of data tables and diff views.

## Components

### Buttons
- **Primary ('Aplicar Correção'):** Background `#F97316`, text `#090D16`, `font-weight: 700`, uppercase `Space Grotesk`. Zero border-radius. Active state shifts background to `#EA580C`. Hover renders a sharp inverted highlight border: `1px solid #FFFFFF`.
- **Secondary / Action Ghost:** Background `#161F30`, text `#F3F4F6`, border `1px solid #2A364F`. Hover brings background to `#1E293B` and border to `#F97316`.
- **Destructive / Reject:** Background `rgba(239, 68, 68, 0.10)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.30)`.

### Code Health Score Meter
A compact, 0-radius telemetry card. Displays an oversized `display-hero` metric (e.g., `94`) paired with an industrial progress bar consisting of segmented, 0-radius micro-blocks:
- `91–100`: Text `#10B981`, accent status: `EXCELLENT`.
- `71–90`: Text `#EAB308`, accent status: `GOOD`.
- `41–70`: Text `#F97316`, accent status: `ATTENTION`.
- `0–40`: Text `#EF4444`, accent status: `CRITICAL`.

### Badges & Filter Counters
- **Category Badges (`SECURITY`, `PERFORMANCE`, `QUALITY`, `MAINTAINABILITY`):** Rendered in `label-sm` font. Monospaced bracket wrapper `[SECURITY]`, 1px solid hairline border matching the category tone, background `rgba(..., 0.08)`.
- **Real-Time Counter Pills:** Embedded inside filter tabs. Monospace JetBrains Mono digits enclosed in a sharp rectangular shell: background `#090D16`, border `1px solid #2A364F`, padding `1px 5px`. Active filter glows with primary `#F97316` text and border.

### Input Tabs (Modalidade de Input)
- **Variants:** `[Código Manual]`, `[Upload Arquivo]`, `[URL PR/MR]`.
- **Styling:** Connected horizontal ribbon. Inactive tabs are `#111827` with `#9CA3AF` text and `1px solid #1F2937`. The active tab is `#161F30` with white text, zero border-bottom, and an unmistakable `2px solid #F97316` top accent stripe.

### Monaco Editor Container & Inline Diff
- **Editor Frame:** Wrapped in `#1F2937` 1px outer casing with a top bar displaying filepath, encoding (`UTF-8`), and branch status.
- **Severity Gutter Markers:** Monospaced line numbers flanking a 4px-wide solid severity stripe on affected lines (e.g., `#EF4444` for Critical security vulnerabilities).
- **Inline Diagnostics:** Rendered directly below the faulted code line with a 0-radius card (`background: #111827; border-left: 3px solid [SeverityColor]; border-top: 1px solid #1F2937`).
- **Diff Viewers (Side-by-Side & Unified):**
  - Additions: Background `rgba(16, 185, 129, 0.12)`, text `#34D399`, gutter glyph `+`.
  - Deletions: Background `rgba(239, 68, 68, 0.12)`, text `#F87171`, gutter glyph `-`.
  - Word-level diff changes inside lines highlighted with higher opacity `rgba(..., 0.28)`.

### Issue Alert Cards
- **Structure:** 0-radius card, background `#111827`, border `1px solid #1F2937`.
- **Severity Indicator:** Left border is 3px thick with the respective OWASP severity color.
- **Top Row:** Badges for category and OWASP rule ID (e.g., `OWASP-A03:2021-Injection`), paired with line reference badge (e.g., `L142-148`).
- **Action Footers:** Immediate action strip featuring one-click 'Aplicar Correção' button alongside secondary keyboard shortcut clues (`⌘↵`).

### Checkboxes & Radios
- Box size `14px x 14px`, 0-radius. 
- Border `1px solid #2A364F`, background `#090D16`.
- Checked state: Background `#F97316`, border `#F97316`, containing an unaliased hard square fill or `#090D16` checkmark.