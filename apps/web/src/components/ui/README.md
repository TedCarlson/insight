# UI System: Command Center + No-Drift Primitives

> **Doc note:** Canonical context lives in `/README.md`. When you update this area of the app, update the relevant README section in the same PR.

This folder is the **single source of truth** for the app’s UI building blocks.

## Goals

1. **No drift**
   - Pages should not invent styles.
   - Pages should compose primitives from `components/ui/*` (and patterns built from them).

2. **Console-driven appearance**
   - Visual changes should be made centrally:
     - **Tokens** (CSS variables) define values.
     - **Semantic UI classes** (`styles/ui.css`) define styling recipes.
     - **Primitives** in this folder use semantic classes and expose variants.
   - One change → the entire app updates.

3. **Predictable page construction**
   - Building a new screen should feel like assembling lego bricks:
     - `PageShell` + `PageHeader`
     - `Card` containers
     - `Button`, `Field`, `TextInput`, `Select`, `Pill`, etc.

---

## “Rules of the Road”

### Pages SHOULD:
- Use `PageShell` and `PageHeader` for layout + titles.
- Use `Card` for major sections.
- Use `Button`, `TextInput`, `Select`, `Field`, `Pill` for controls.
- Prefer tokens (`var(--to-*)`) over hardcoded colors.

### Pages SHOULD NOT:
- Use raw `<button>` / `<input>` / `<select>` with long `className="..."` strings.
- Use inline styles unless it’s referencing tokens and there is no semantic class yet.
- Create one-off components that duplicate primitives.

If you see inline styles/classes appearing in pages, consider that drift and refactor into:
- a primitive, or
- a pattern component, or
- a semantic class in `styles/ui.css`.

---

## Architecture Overview

### 1) Tokens (values)
- `apps/web/src/styles/tokens.css` = base token values
- Theme overlays:
  - `apps/web/src/styles/tokens.theme-glass.css` (current preferred default direction)
  - `apps/web/src/styles/tokens.theme-a.css` (experimental)

Themes are activated via:
- `<html data-theme="glass">` etc.

### 2) Semantic UI classes (recipes)
- `apps/web/src/styles/ui.css` defines stable classnames used everywhere:
  - `.to-card`, `.to-btn`, `.to-input`, `.to-select`, `.to-pill`, `.to-label`, etc.
- Primitives should rely on these semantic classes so we can update styling globally.

### 3) Primitives (composition layer)
This folder contains primitives that map variants/props to semantic classes:

**Foundations**
- `PageShell`, `PageHeader`
- `Card` (variants: `default | subtle | elevated`)
- `Button` (variants: `primary | secondary | ghost`)
- `Field` (label wrapper)

**Form controls**
- `TextInput`
- `Select`
- `Pill`
- `Badge` (pill-shaped)

**Micro-actions**
- `IconButton` (glyph actions like help/settings/kebab)

**Feedback**
- `Notice` (inline, low-contrast)
- `Toast` (`ToastProvider` + `useToast`)

**Overlays**
- `Modal` (Escape + backdrop click; uses `--to-overlay`)

**Navigation / state**
- `SegmentedControl` (tabs-lite)
- `Pagination` (prev/next + indicator)

### 4) Patterns (composed building blocks)
Patterns are reusable page structures built from primitives:

- `Toolbar` (standard list controls: search/filters/actions)
- `DataTable` (header/body/row/footer; zebra + hover; token-driven)
- `EmptyState` (no-data pattern with optional actions)

### 5) Kit / Workbench (dev-only)
- Route: `/dev/kit`
- Purpose:
  - Document canonical patterns
  - Preview variants
  - Verify themes
  - Copy/paste recipes (without inventing new ones)

> If it’s not in `/dev/kit`, it’s not “official.”

---

## Theme Console

There is a Theme Console selector mounted globally:
- `apps/web/src/components/ThemeConsole.tsx`

It sets:
- `document.documentElement.dataset.theme = "glass"` (etc)
- persists in localStorage

This enables “console-driven” appearance changes.

**Hydration note (Next.js):**
- Portal-based UI (e.g. Toast) must only render portals after mount to avoid hydration mismatch.
- Current `ToastProvider` defers portal rendering until `mounted === true`.

---

## How to add a new UI element (the right way)

### Step A — Decide: primitive or pattern?
- **Primitive**: button/input/card/badge/pill — reusable everywhere
- **Pattern**: toolbar/table/empty state — composed from primitives

### Step B — Add semantic class first (if needed)
Add styles to `apps/web/src/styles/ui.css` using a stable semantic name.
Example:
- `.to-badge`, `.to-table`, `.to-toolbar`

### Step C — Add a primitive/pattern component
Add a `.tsx` file in this folder that uses those semantic classes.
Keep it thin: it should mainly map `variant` props to classnames.

### Step D — Demonstrate it in `/dev/kit`
Update `/dev/kit` to show the new element and its variants.

---

## Reset / Recovery Notes

If this repo is reset or rehydrated, re-establish these anchors:

1) Global imports:
- `styles/globals.css` imports `ui.css`
- `app/layout.tsx` imports `tokens.theme-glass.css` (theme overlay available globally)

2) Theme console:
- `ThemeConsole` is mounted in `app/layout.tsx` (with FooterHelp)

3) Kit (dev-only):
- `/dev/kit` route exists and renders the canonical UI examples

Once those three are in place, the UI system “reconnects.”

---

## Current status (living checklist)

### Theme + tokens
- [x] Tokens exist + glass theme overlay
- [x] Zebra + hover table tokens: `--to-row-zebra`, `--to-row-hover`
- [x] Overlay token: `--to-overlay`
- [x] Danger token: `--to-danger`

### Semantic layer
- [x] Semantic class layer exists (`ui.css`) and is used by core controls

### Primitives
- [x] Card / Button / Field / PageShell / PageHeader
- [x] TextInput / Select / Pill / Badge (pill)
- [x] IconButton
- [x] SegmentedControl
- [x] Modal
- [x] Notice + Toast (with hydration-safe portal)
- [x] Pagination

### Patterns
- [x] Toolbar
- [x] DataTable (Header/Body/Row/Footer; zebra + hover)
- [x] EmptyState

### Kit
- [x] `/dev/kit` shows canonical patterns + variants
- [x] Theme console changes app appearance globally

### Next improvements
- [ ] Reduce remaining raw inline styles in kit (convert any leftovers into semantic classes)
- [ ] Add “Form row” pattern (label + control + help + error) if needed
- [ ] Optional: persist user theme preference server-side (cookie) to avoid flash

---

## Contributing

### Non-negotiables (anti-drift rules)

1) **Do not style raw elements in pages**
   - Avoid page-level `<button className="...">`, `<input className="...">`, `<select className="...">`.
   - Use primitives:
     - `Button`, `TextInput`, `Select`, `Pill`, `Field`, `Card`, `PageShell`, `PageHeader`

2) **No “new styles” in feature pages**
   - If you need a new look, add it to `styles/ui.css` (semantic class) and/or add a variant on an existing primitive.

3) **Tokens first**
   - All colors, borders, shadows should come from tokens (`var(--to-*)`).
   - If something needs a new token (rare), add it to the token layer and document it.

4) **If it’s reusable, it belongs in `/dev/kit`**
   - If a new element/pattern isn’t demonstrated in `/dev/kit`, it’s not “official.”

---

## Page Template

When creating a new page, start from this template:

```tsx
import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";

export default function ExamplePage() {
  return (
    <PageShell>
      <PageHeader
        title="Page Title"
        subtitle="One sentence describing what this page does."
        actions={
          <>
            <Button variant="secondary" type="button">Secondary</Button>
            <Button variant="primary" type="button">Primary</Button>
          </>
        }
      />

      <Card variant="subtle">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Search">
            <TextInput placeholder="Search…" />
          </Field>

          <Field label="Range">
            <Select defaultValue="week" aria-label="Range">
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--to-ink-muted)]">
            Main content goes here. Prefer patterns from /dev/kit.
          </div>
          <Button variant="secondary" type="button">Action</Button>
        </div>
      </Card>
    </PageShell>
  );
}