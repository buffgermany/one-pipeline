# Design System: Buff One Pipeline — Cold Calling Cockpit

> **Design Philosophy**: A Linear.app inspired, dark high-contrast sales cockpit built for extreme focus, zero friction, and high-speed cold call workflows. Tactical monochrome surfaces, ultra-crisp 1px borders, precision typography, and single-accent Cold-Call Emerald highlighting.

---

## 1. Visual Theme & Atmosphere

- **Aesthetic Direction**: Linear.app Dark High-Contrast Cockpit
- **Atmosphere**: Professional, utilitarian, and razor-sharp. Designed for sales reps who make 100+ calls a day. Zero visual bloat, zero distracting decorative gradients, zero floaty rounded cards.
- **Density Score**: **8 / 10** (Balanced Cockpit — dense data tables with generous touch targets and instant side-peek drawer access)
- **Variance Score**: **4 / 10** (Grid-structured, predictable dual-pane layout with dedicated focus zones)
- **Motion Score**: **5 / 10** (Snappy 120ms–150ms hardware-accelerated micro-transitions, crisp drawer slides, real-time pulse indicators)

---

## 2. Color Palette & Functional Roles

The palette is strictly calibrated around absolute dark zinc/obsidian neutrals with a single primary accent (**Cold-Call Emerald**) and crisp status indicators.

### Core Surfaces & Neutrals
- **Page Void (`--color-page-void`)**: `#0B0C0E` — Deep pitch void background, reduces eye strain during long calling sessions.
- **Cockpit Panel Surface (`--color-surface-panel`)**: `#121316` — Primary card & drawer fill; flat dark graphite.
- **Subtle Surface Lift (`--color-surface-lift`)**: `#181A1F` — Hover states, active row selections, and header bars.
- **Border Subtle (`--color-border-subtle`)**: `#1F2026` — 1px primary structural grid dividers.
- **Border Focus (`--color-border-focus`)**: `#2E313B` — Interactive hover & keyboard focus rings.

### Typography Ink Colors
- **Off-White Ink (`--color-ink-primary`)**: `#F4F4F6` — High contrast text for lead titles, key metrics, and headlines.
- **Muted Fog Ink (`--color-ink-secondary`)**: `#8C8F9A` — Metadata, labels, phone numbers, and subtext.
- **Disabled Charcoal (`--color-ink-muted`)**: `#4A4D57` — Placeholder text, inactive hotkey hints.

### Tactical Accents & Status Indicators
- **Cold-Call Emerald (`--color-accent-emerald`)**: `#10B981` — Primary accent for active dialer, successful conversions, connected calls, and key CTAs.
- **Emerald Tint (`--color-emerald-tint`)**: `rgba(16, 185, 129, 0.12)` — Background fill for "Connected" & "Converted" badges.
- **Callback Amber (`--color-status-amber`)**: `#F59E0B` — Scheduled callbacks, pending leads.
- **Voicemail Cyan (`--color-status-cyan`)**: `#06B6D4` — Voicemails, automated drops.
- **Disqualified Rose (`--color-status-rose`)**: `#F43F5E` — Disqualified leads, call errors, busy signals.

> **Mandatory Color Rule**: No purple/neon glows. No multi-color gradient text. Saturation strictly controlled.

---

## 3. Typography Architecture

Preserving the custom project typography (**Excon** for display/controls and **GeneralSans** for body/data) with tabular number formatting for rapid scanning.

### Font Stacks
- **Display & Controls**: `'Excon', -apple-system, BlinkMacSystemFont, sans-serif`
- **Body & Data**: `'GeneralSans', -apple-system, BlinkMacSystemFont, sans-serif`
- **Numeric & Hotkey Monospace**: `'JetBrains Mono', 'Geist Mono', monospace`

### Typography Hierarchy Scale
| Token Role | Font Family | Size | Weight | Tracking | Line Height |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | `Excon` | `28px` | `700 (Bold)` | `-0.02em` | `1.1` |
| **Section Title** | `Excon` | `18px` | `600 (Semibold)` | `-0.01em` | `1.2` |
| **Card / Label Header** | `Excon` | `14px` | `600 (Semibold)` | `0em` | `1.3` |
| **Body Primary** | `GeneralSans` | `14px` | `400 (Regular)` | `0em` | `1.5` |
| **Body Secondary** | `GeneralSans` | `13px` | `400 (Regular)` | `0em` | `1.4` |
| **Badge / Hotkey Tag** | `Excon` | `11px` | `600 (Semibold)` | `0.04em` | `1.0` |
| **Tabular Numbers** | `GeneralSans` | `16px` | `700 (Bold)` | `-0.01em` | `1.0` (font-variant-numeric: tabular-nums) |

---

## 4. Spacing System & Grid Scale

The spacing scale is built on a **6px base grid** optimized for a balanced sales cockpit.

### Spacing Tokens
- `--space-1`: `3px`
- `--space-2`: `6px`
- `--space-3`: `12px` (Default gap between dense items)
- `--space-4`: `16px` (Component internal padding)
- `--space-5`: `24px` (Section padding & main grid gaps)
- `--space-6`: `36px` (Page container padding)
- `--space-7`: `48px` (Major section separation)

### Container Layout Boundaries
- **App Max Width**: Full-width fluid layout (`100%`) with max content cap of `1600px`.
- `--radius-sm`: `4px` (Hotkey badges, status dots)
- `--radius-md`: `6px` (Buttons, input fields, pill tags)
- `--radius-lg`: `8px` (Cards, drawers, side-peek panels)

---

## 5. Component Stylings & Specifications

### 5.1 Linear Flat Border-Grid Cards
- **Background**: `#121316`
- **Border**: `1px solid #1F2026`
- **Corner Radius**: `8px` (`--radius-lg`)
- **Shadow**: `none` (No elevated drop shadows; hierarchy expressed via 1px border highlights)
- **Hover State**: Border shifts to `#2E313B`, surface lifts to `#181A1F` (120ms transition).

### 5.2 Primary Dial & Action Buttons
- **Primary CTA (Start Call / Dial)**:
  - Background: `#10B981` (Cold-Call Emerald)
  - Text: `#052E16` (Deep Emerald Ink for maximum legibility)
  - Font: `Excon`, 14px, Semibold
  - Active Press: `-1px` vertical translate, scale `0.98`
  - Focus Ring: `2px solid #10B981`, outline offset `2px`
- **Secondary Action (Disposition / Skip)**:
  - Background: `#181A1F`
  - Border: `1px solid #1F2026`
  - Text: `#F4F4F6`
  - Hover: Border `#2E313B`, background `#22252C`

### 5.3 Linear Tactical Pill Badges
- **Dimensions**: Height `20px`, Padding `0 8px`, Corner Radius `4px`
- **Typography**: `Excon`, `11px`, Semibold, Uppercase tracking `0.04em`
- **Structure**: 6px status dot on left + label text
- **Variants**:
  - *Connected*: Emerald fill tint `rgba(16,185,129,0.12)`, text `#10B981`, border `1px solid rgba(16,185,129,0.3)`
  - *Callback*: Amber fill tint `rgba(245,158,11,0.12)`, text `#F59E0B`, border `1px solid rgba(245,158,11,0.3)`
  - *Voicemail*: Cyan fill tint `rgba(6,182,212,0.12)`, text `#06B6D4`, border `1px solid rgba(6,182,212,0.3)`
  - *Disqualified*: Rose fill tint `rgba(244,63,94,0.12)`, text `#F43F5E`, border `1px solid rgba(244,63,94,0.3)`

### 5.4 Side-Peek Lead Drawer (The Caller Cockpit)
- **Width**: `440px` fixed right-aligned side panel
- **Position**: Slides in from right over layout without shifting center queue grid
- **Border**: `1px solid #1F2026` left border
- **Sections**:
  1. *Header bar*: Lead Name, Company, Local Time (with live clock), Quick Status Badge
  2. *Action bar*: Big Emerald Dial / Hang Up button + Mute button
  3. *Objection Handling / Script Tabs*: Sticky tab bar (`General Pitch`, `Pricing`, `Gatekeeper`, `Not Interested`)
  4. *Quick Notes & Disposition Buttons*: One-click outcome logger

---

## 6. Layout Principles: Linear Dual-Pane Cockpit

The workspace is organized into a persistent three-zone architecture:

```
+-----------------------------------------------------------------------------------+
|  NAV SIDEBAR  |  CENTER WORKBENCH (QUEUE & METRICS)           | SIDE-PEEK DRAWER  |
|  (Collapsible) |                                               | (Caller Console)  |
|               |  +-----------------------------------------+  |                   |
|  [Logo]       |  | Metrics Bar: Calls | Dispos | Conversion |  | Lead: Acme Corp   |
|  [Queue]      |  +-----------------------------------------+  | Time: 14:32 EST   |
|  [Leads]      |  | Linear Queue Table                      |  |                   |
|  [Analytics]  |  | > Lead 1  [Connected]   03:42  [View]   |  | [ DIAL NOW ]      |
|  [Settings]   |  | > Lead 2  [New]         --:--  [View]   |  | Script & Notes    |
|               |  | > Lead 3  [Callback]    15:00  [View]   |  | Disposition Hotkeys|
+-----------------------------------------------------------------------------------+
```

1. **Left Nav Sidebar**: 220px collapsible menu (Icons + text, subtle active indicator bar).
2. **Center Workbench**: Live calling stats (Calls today, Conversion rate, Queue remaining) + high-density lead queue table.
3. **Right Side-Peek Drawer**: Slide-in active calling console. Reps never leave the page to complete a call.

---

## 7. Interaction Model & Keyboard Shortcuts

Designed for hybrid mouse & keyboard workflows. Primary call controls feature tactile inline hotkey badges `[Key]`.

### Keyboard Hotkey Map
- `[Space]`: Toggle Active Call Mute / Unmute
- `[1]`: Mark Disposition -> **Connected / Qualified**
- `[2]`: Mark Disposition -> **Scheduled Callback**
- `[3]`: Mark Disposition -> **Left Voicemail**
- `[4]`: Mark Disposition -> **Not Interested / Disqualified**
- `[Cmd + K]` / `[Ctrl + K]`: Open Quick Lead Search Command Palette
- `[J]` / `[K]`: Navigate Next / Previous lead in queue table

---

## 8. Motion & Micro-Interactions

- **Transition Engine**: `120ms` to `150ms` `cubic-bezier(0.16, 1, 0.3, 1)` (Linear signature snappiness).
- **Drawer Slide**: `200ms ease-out` sliding right-to-left.
- **Active Call Status Indicator**: Infinite `2s` subtle emerald pulse ring around live call duration badge.
- **Button Feedback**: `-1px` active Y-translate on click.
- **Data Loading**: Skeletal shimmer boxes matching exact card dimensions (`linear-gradient` over `#181A1F`). No spinning circles.

---

## 9. Anti-Patterns & Strict Bans (Extended Cockpit Suite)

The following design clichés are **STRICTLY BANNED** in this codebase:

1. ❌ **No AI Neon/Purple Gradients**: No purple glow shadows, blue-to-pink gradient text, or neon buttons.
2. ❌ **No Heavy Drop Shadows**: No generic elevated cards with 0 20px blur shadows. Use 1px borders.
3. ❌ **No Blocking Modal Overlays**: Never launch a modal that covers the side-peek caller window during an active call.
4. ❌ **No Emojis in UI Labels**: Use official Lucide icons (`Phone`, `CheckCircle2`, `Clock`, `User`) instead of raw emojis.
5. ❌ **No Cards-Inside-Cards**: No nesting boxed containers inside existing boxed containers. Use clean horizontal dividers instead.
6. ❌ **No Circular Loading Spinners**: Spinners cause visual jump. Use skeletal shimmers matching exact dimensions.
7. ❌ **No `Inter` or Generic Serif Fonts**: Use specified `Excon` and `GeneralSans` font stack.
8. ❌ **No Pure Black (`#000000`) Surfaces**: Main void is strictly `#0B0C0E`.

---

## 10. Summary Verification Checklist for Developers

When building or updating UI components for Buff One Pipeline:
- [ ] Is the surface color `#121316` with a `1px solid #1F2026` border?
- [ ] Is `Excon` used for headers/controls and `GeneralSans` for body?
- [ ] Does primary call CTA use `#10B981` Cold-Call Emerald?
- [ ] Are status badges styled as tactical pills (20px height, tinted fill)?
- [ ] Do interactive elements include hotkey hint badges where applicable?
- [ ] Is the side-peek drawer accessible without losing queue view?
