---
name: Jürgen Etzlstorfer portfolio
description: A living portfolio of websites and projects, updated from public GitHub data.
colors:
  federal-blue: "#1e4fff"
  fluoro-pink: "#ff3ea5"
  sunflower: "#ffd22a"
  warm-paper: "#fbf5ea"
  deep-paper: "#f1e7d6"
  near-black: "#17191d"
  muted-ink: "#56534e"
  blue-rule: "rgba(30, 79, 255, .54)"
  pink-rule: "rgba(255, 62, 165, .62)"
typography:
  display:
    fontFamily: "Anton, sans-serif"
    fontSize: "clamp(3.4rem, 6.5vw, 5.2rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Anton, sans-serif"
    fontSize: "clamp(2.8rem, 6vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Anton, sans-serif"
    fontSize: "clamp(1.65rem, 3.25vw, 3.2rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Mona Sans Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Monaspace Neon, monospace"
    fontSize: "0.72rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.015em"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.fluoro-pink}"
    textColor: "{colors.near-black}"
    typography: "{typography.label}"
    padding: "0 18px"
    height: "46px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.federal-blue}"
    typography: "{typography.label}"
    padding: "0 18px"
    height: "46px"
  search-field:
    backgroundColor: "rgba(255, 255, 255, .2)"
    textColor: "{colors.near-black}"
    typography: "{typography.body}"
    padding: "0 11px"
    height: "43px"
---

# Design System: Two-Ink Riso

## Overview

**Creative North Star: "Two-Ink Riso"**

This is a living portfolio of websites and projects. Its visual style borrows from two-ink risograph printing through registration marks, color overlaps, paper-like texture and bold geometric artwork; these are visual motifs, not descriptions of the work. The public-only, automatically refreshed source data stays tactile and personal without making the site feel like a terminal or product dashboard.

The composition is editorial and work-first. Lead with featured websites, followed by the contribution calendar, community work and credentials. Keep the system honest: every project, count and link comes from public source data.

**Key Characteristics:**
- Warm paper and vivid spot inks with visible, restrained grain.
- Condensed display lettering paired with readable sans-serif and monospaced metadata.
- Square, printed rules and hard offset shadows instead of soft floating surfaces.

## Colors

Warm paper is the ground; federal blue, fluoro pink and sunflower act as separate spot inks, with near-black carrying the text.

### Primary
- **Federal Blue** (`#1e4fff`): Main display ink, links, focus rings and source cues.

### Secondary
- **Fluoro Pink** (`#ff3ea5`): Current-project emphasis, registration offsets, rules and primary actions.

### Tertiary
- **Sunflower** (`#ffd22a`): Language marks, selected project tiles and small graphic accents.

### Neutral
- **Warm Paper** (`#fbf5ea`): Page background and the dominant unprinted surface.
- **Deep Paper** (`#f1e7d6`): Recessed artwork surfaces.
- **Near-Black** (`#17191d`): Primary text and registration details.
- **Muted Ink** (`#56534e`): Supporting copy and secondary metadata.
- **Blue Rule** (`rgba(30, 79, 255, .54)`) and **Pink Rule** (`rgba(255, 62, 165, .62)`): Fine dividers and section boundaries.

**The Spot-Ink Rule.** Keep the blue, pink and sunflower distinct; use overlap and multiply blending for the graphic treatment rather than inventing extra accent colors.

## Typography

**Display Font:** Anton (with sans-serif fallback)  
**Body Font:** Mona Sans Variable (with sans-serif fallback)  
**Label/Mono Font:** Monaspace Neon (with monospace fallback)

**Character:** Anton makes project names and section headings read like bold press lettering. Mona Sans keeps descriptions comfortable and direct; Monaspace Neon turns dates, counts and source notes into compact production marks.

### Hierarchy
- **Display** (400, `clamp(3.4rem, 6.5vw, 5.2rem)`, `.86` line-height): The oversized two-line name at the opening.
- **Headline** (400, `clamp(2.8rem, 6vw, 5.4rem)`, `.9` line-height): Section titles such as year in review.
- **Title** (400, `clamp(1.65rem, 3.25vw, 3.2rem)`, `.95` line-height): The active featured project.
- **Body** (400, `1rem`, `1.55` line-height): Project descriptions and explanatory copy; keep reading measures near 52–68 characters where the layout allows.
- **Label** (400, `.72rem`, `1.4` line-height, `.015em` tracking): Dates, counters, language tags and uppercase source notes.

**The No-Terminal-Cosplay Rule.** Monospace is metadata, not a full-page costume; do not make ordinary copy or navigation look like a command line.

## Layout

Use a centered, fluid page frame capped at 1320px. At wide widths the frame keeps 36px gutters; below 980px it becomes a 760px maximum frame with 22px gutters, and below 680px the page keeps 18px gutters. The opening is intentionally compact: name and context lead directly into a featured website and a neighboring horizontal project rail.

At 980px and below, the featured website image scales to its grid track rather than enforcing a fixed minimum height. At 680px and below, the featured area stacks its image above project information, the rail becomes a horizontal swipe row, and secondary navigation items hide while GitHub remains visible. Let the contribution calendar scroll within its own region on narrow screens; avoid page-wide horizontal overflow.

Use an 8px-based spacing rhythm, with 4px reserved for tight label and stamp details. Preserve generous section breaks so the project list reads clearly rather than becoming a dense dashboard.

## Elevation & Depth

The page is flat at rest. Paper tone, grain, thin rules, multiply-blended inks and offset registration provide depth. Shadows are hard, small, and colored: they should look like a second misregistered pass, never ambient blur.

### Shadow Vocabulary
- **Primary action** (`4px 4px 0 var(--blue)`): Firm blue registration offset under the pink action.
- **Active tile** (`3px 3px 0 var(--pink)`): Pink offset that makes the selected project tactile.
- **Arrow control** (`2px 2px 0 var(--pink)`): Small, consistent offset for navigation buttons.

**The Offset-Only Rule.** Use hard offset shadows as ink registration; do not add soft elevation or blurred drop shadows.

## Shapes

The interface uses square corners, thin blue or pink rules, clipped geometric shapes and small registration crosses. Circles belong to the artwork, status marks and swatches, not to general-purpose cards or controls. Keep the paper-like texture visible but subtle enough that text remains crisp.

## Components

### Buttons
- **Shape:** Square corners with a crisp border or solid ink field.
- **Primary:** Fluoro pink with near-black uppercase label text; 46px minimum height and 18px horizontal padding.
- **Hover / Focus:** A short, tactile 2px press with the offset shadow reduced; keyboard focus uses a clear 3px federal-blue outline.
- **Secondary:** Transparent paper surface, federal-blue text and border, with a pink offset shadow.

### Chips
- **Style:** Compact transparent labels with a fine blue border; use language color only as a small leading dot.
- **State:** Live-site chips use pink; selected project tiles use a sunflower wash and blue border.

### Cards / Containers
- **Corner Style:** Square; avoid rounding repository surfaces.
- **Background:** Paper at rest, deep paper for artwork, and a light sunflower wash only for the selected rail tile.
- **Shadow Strategy:** No resting shadow; the active tile uses the hard pink offset.
- **Border:** Fine blue or pink rules carry structure.
- **Internal Padding:** 8–13px for tiles and compact controls; larger project sections use open space rather than nested boxes.

### Inputs / Fields
- **Style:** Transparent, warm-paper-compatible field with a thin federal-blue border and compact padding.
- **Focus:** Use the shared high-contrast federal-blue focus outline; keep the existing pink search marker.

### Navigation
- **Style:** Compact, bold Mona Sans links with open space and no pill backgrounds. Keep the GitHub link at the right edge; on mobile hide only the two secondary section links.

### Featured Website
The featured website is the signature component: show a generous screenshot or geometric preview with a small language/date caption. Use the selected rail tile's language-driven shapes and colors in the large preview, updating them together when the project changes. Keep the project title, concise description and direct source/live actions adjacent to it on wider screens; stack them cleanly on mobile.

## Do's and Don'ts

### Do:
- **Do** lead with real public projects and direct source or live-demo links.
- **Do** honor the explicit `featured` repository order in `portfolio.config.mjs`; use GitHub pins and repository activity to fill remaining slots.
- **Do** use the established federal-blue, fluoro-pink, sunflower, warm-paper and near-black palette.
- **Do** keep paper-like texture and off-register graphic layers subtle around readable text.
- **Do** preserve keyboard operation, visible focus, and reduced-motion behavior.

### Don't:
- **Don't** expose private repository or contribution data, or invent testimonials, customer claims, talk lists or usage metrics.
- **Don't** add fake terminal chrome, a generic rounded-card grid, soft dashboard shadows or unrelated accent colors.
- **Don't** describe websites or projects as prints; the risograph influence is visual only.
- **Don't** add trackers or runtime third-party asset requests.
