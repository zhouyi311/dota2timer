# ez2run Design System

This document outlines the design system for ez2run, creating a cohesive and consistent visual language across the project.

## 1. Color Palette

The color palette is based on a dark theme with vibrant accents.

| Name                 | Hex/RGBA                             | Variable                      | Usage                               |
| -------------------- | ------------------------------------ | ----------------------------- | ----------------------------------- |
| Background           | `#0f172a`                            | `--color-background`          | Main page background                |
| Primary Accent       | `#38bdf8`                            | `--color-primary`             | Links, active elements, highlights  |
| Secondary Accent     | `#818cf8`                            | `--color-secondary`           | Hover states, secondary highlights  |
| Surface              | `rgba(30, 41, 59, `0.7`)`              | `--color-surface`             | Card backgrounds, modal windows     |
| Border               | `rgba(255, 255, 255, `0.1`)`           | `--color-surface-border`      | Borders for cards and sections      |
| Text (Base)          | `#f8fafc`                            | `--color-text-base`           | Default text color                  |
| Text (Muted)         | `#94a3b8`                            | `--color-text-muted`          | Subtitles, descriptions, placeholders |
| Text (Inverse)       | `#0f172a`                            | `--color-text-inverse`        | Text on primary-colored backgrounds |

## 2. Typography

We use two primary fonts: 'Inter' for sans-serif text and 'Google Sans Code' for monospaced and display text.

### Font Families
- **Sans-serif:** `var(--font-family-sans)` - 'Inter', sans-serif
- **Monospace:** `var(--font-family-mono)` - 'Google Sans Code', monospace

### Font Size Scale
A modular scale is used for responsive and consistent typography.

| Size | Variable          | Value (rem/px) | Typical Use                |
| ---- | ----------------- | -------------- | -------------------------- |
| xs   | `--font-size-xs`  | 0.75rem / 12px | Small text, legal          |
| sm   | `--font-size-sm`  | 0.875rem / 14px| Card descriptions, footers |
| base | `--font-size-base`| 1rem / 16px    | Body text, paragraphs      |
| lg   | `--font-size-lg`  | 1.125rem / 18px| Subtitles                  |
| xl   | `--font-size-xl`  | 1.25rem / 20px | Card titles                |
| 2xl  | `--font-size-2xl` | 1.5rem / 24px  | Section headings (h3)      |
| 3xl  | `--font-size-3xl` | 2rem / 32px    | Sub-headings (h2)          |
| 4xl  | `--font-size-4xl` | 3rem / 48px    | Main page titles (h1)      |

### Font Weights
- Normal: `400`
- Semibold: `600`

### Line Heights
- Base: ``1.6`` (`--line-height-base`)
- Heading: ``1.2`` (`--line-height-heading`)

## 3. Spacing

An 8px-based spacing scale is used for all margins, paddings, and gaps to ensure a consistent rhythm.

| Step | Variable    | Value (rem/px) |
| ---- | ----------- | -------------- |
| 1    | `--space-1` | 0.5rem / 8px   |
| 2    | `--space-2` | 1rem / 16px    |
| 3    | `--space-3` | 1.5rem / 24px  |
| 4    | `--space-4` | 2rem / 32px    |
| 5    | `--space-5` | 3rem / 48px    |
| 6    | `--space-6` | 3.75rem / 60px |
| 7    | `--space-7` | 5rem / 80px    |

## 4. Components

### Card

The `card` component is the primary UI element for displaying content blocks.

**Base Class:** `.card`

**Modifiers:**
- `.card--activated`: For interactive cards that have hover effects.
- `.card--disabled`: For non-interactive or placeholder cards.

**Structure:**
- `.card__title`: The title of the card.
- `.card__desc`: The description text within the card.

**Example:**
```html
<!-- Activated Card -->
<a href="#" class="card card--activated">
    <div class="card__title">Dota2 Timer</div>
    <div class="card__desc">A web timer for Dota 2.</div>
</a>

<!-- Disabled Card -->
<div class="card card--disabled">
    <div class="card__title">Upcoming...</div>
    <div class="card__desc">More tools are upcoming...</div>
</div>