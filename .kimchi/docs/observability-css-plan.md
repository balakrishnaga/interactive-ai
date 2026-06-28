# Plan: Align Observability Panel CSS with Chatbot Design System

## Goal
Make the `ObservabilityPanel` component visually consistent with the existing chatbot UI defined in `globals.css` (Claude-inspired warm/cream design system), replacing Bootstrap-default styling with custom design-token-based styling.

## Current State
- `services/nextjs-app/src/components/ObservabilityPanel.tsx` uses Bootstrap classes:
  - `bg-light`, `border-top`, `card`, `card-body`, `btn btn-primary btn-sm`, `form-label`, `form-control`, `form-range`, `form-check`, `alert alert-warning`, `text-muted`, `border-primary`, `container-fluid`, `row`, `col-md-4`, `col-md-8`, etc.
- `services/nextjs-app/src/app/globals.css` defines a custom design system with CSS variables:
  - Backgrounds: `--bg-primary: #FAF9F3`, `--bg-secondary: #F4F2E9`, `--bg-chat: #FFFFFF`, `--bg-hover: #ECE9DE`
  - Surfaces: `--surface-user: #F5F1E6`, `--surface-code: #F8F6F0`, `--surface-input: #FFFFFF`
  - Text: `--text-primary: #1C1917`, `--text-secondary: #716D63`, `--text-tertiary: #A8A29E`, `--text-muted: #B0AAA0`
  - Accent: `--accent-primary: #B8860B`, `--accent-hover: #996515`, `--accent-light: rgba(184,134,11,0.08)`
  - Borders: `--border-light: #E7E2D5`, `--border-medium: #D6CFB9`, `--border-focus: #B8860B`
  - Radii: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-xl: 24px`
  - Shadows, typography, transitions already established.
- `services/nextjs-app/src/app/custom-bootstrap.css` is intentionally minimal and should remain so.

## Design Direction
The observability panel should feel like a natural extension of the chat interface:
- Use cream/off-white backgrounds (`--bg-primary`, `--bg-secondary`, `--bg-chat`) instead of Bootstrap `bg-light` (#f8f9fa).
- Use warm gold accent (`--accent-primary`) for primary buttons, active states, highlights, and borders.
- Use subtle warm borders (`--border-light`, `--border-medium`) instead of Bootstrap gray borders.
- Use rounded corners from the design system (`--radius-md`, `--radius-lg`).
- Use the design system font and text colors.
- Maintain the two-column layout (controls left, trace right) but style it consistently.
- Preserve existing functionality and accessibility (keyboard focus, disabled states, aria attributes).

## Chunks

### Chunk 1 — Add observability styles to `globals.css`
**Complexity:** simple
**Files:** `services/nextjs-app/src/app/globals.css`

Add a new section at the end of `globals.css` for the observability panel. Use existing CSS variables. Include:

1. `.observability-panel` — container
   - `background: var(--bg-primary);`
   - `border-top: 1px solid var(--border-light);`
   - `font-family: var(--font-body);`
   - `color: var(--text-primary);`

2. `.observability-panel .observability-container` — inner wrapper
   - `max-width: 1200px; margin: 0 auto; padding: var(--space-lg) var(--space-xl);`
   - Responsive: on `max-width: 768px` stack columns and reduce padding.

3. `.observability-panel .observability-grid` — two-column layout
   - Use CSS Grid: `display: grid; grid-template-columns: 320px 1fr; gap: var(--space-xl);`
   - On `max-width: 768px`: `grid-template-columns: 1fr;`
   - Do NOT rely on Bootstrap `row`/`col-md-*` for layout; the component will switch to this class.

4. `.observability-panel .observability-section-title` — section headings
   - `font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-md);`

5. `.observability-panel .observability-label` — labels
   - `font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); margin-bottom: var(--space-sm); display: block;`

6. `.observability-panel .observability-input`, `.observability-textarea`, `.observability-range`
   - For input/textarea: `background: var(--surface-input); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 10px 12px; color: var(--text-primary); font-family: var(--font-body); width: 100%; transition: all var(--duration-fast) var(--ease-smooth);`
   - Focus: `border-color: var(--border-focus); box-shadow: var(--shadow-input-focus); outline: none;`
   - Textarea: `resize: none; min-height: 64px;`
   - Range: style the track and thumb to match `--accent-primary` (similar to `.settings-range` in globals.css).

7. `.observability-panel .observability-btn` — primary button
   - `background: var(--accent-primary); color: var(--text-inverse); border: none; border-radius: var(--radius-md); padding: 10px 16px; font-size: 0.875rem; font-weight: 500; cursor: pointer; width: 100%; transition: all var(--duration-fast) var(--ease-smooth);`
   - Hover: `background: var(--accent-hover); transform: translateY(-1px);`
   - Disabled: `opacity: 0.5; cursor: not-allowed; transform: none;`

8. `.observability-panel .observability-upload-box`
   - `background: var(--bg-chat); border: 2px dashed var(--border-medium); border-radius: var(--radius-lg); padding: var(--space-lg); text-align: center; color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-smooth);`
   - Hover (when clickable): `border-color: var(--accent-primary); background: var(--bg-secondary);`
   - Uploading state: `.uploading` — `border-style: solid; border-color: var(--accent-primary); color: var(--accent-primary); cursor: wait;`

9. `.observability-panel .observability-card` — chunk/metric cards
   - `background: var(--bg-chat); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-sm); transition: all var(--duration-fast) var(--ease-smooth);`
   - Highlight variant `.observability-card.highlight` — `border-color: var(--accent-primary); background: var(--accent-light);`

10. `.observability-panel .observability-card-meta` — metadata row
    - `display: flex; flex-wrap: wrap; gap: var(--space-sm); font-size: 0.75rem; color: var(--text-tertiary); margin-top: var(--space-sm);`

11. `.observability-panel .observability-alert` — warning/error alerts
    - `background: var(--accent-light); border: 1px solid rgba(184,134,11,0.2); border-radius: var(--radius-md); padding: var(--space-md); color: var(--accent-primary); font-size: 0.875rem; margin-bottom: var(--space-md);`

12. `.observability-panel .observability-check` — checkbox wrapper
    - `display: flex; align-items: center; gap: var(--space-sm); font-size: 0.875rem; color: var(--text-secondary); cursor: pointer;`
    - Custom checkbox styling (or use accent-color: var(--accent-primary)):
      - `input[type="checkbox"] { accent-color: var(--accent-primary); width: 16px; height: 16px; }`

13. `.observability-panel .observability-metric-grid` — metrics grid
    - `display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md);`
    - On `max-width: 768px`: `grid-template-columns: repeat(2, 1fr);`
    - On `max-width: 480px`: `grid-template-columns: 1fr;`

14. `.observability-panel .observability-empty` — empty state text
    - `color: var(--text-tertiary); font-size: 0.875rem;`

15. `.observability-panel .observability-divider`
    - `border-right: 1px solid var(--border-light);` for desktop two-column divider; hide on mobile.

### Chunk 2 — Update `ObservabilityPanel.tsx` to use design-system classes
**Complexity:** simple
**Files:** `services/nextjs-app/src/components/ObservabilityPanel.tsx`

Replace Bootstrap classes with the new custom classes from Chunk 1. Preserve all behavior and props.

Required changes:
- Outermost `<div className="observability-panel border-top bg-light">` → `<div className="observability-panel">`
- Replace `container-fluid py-3` + `row` + `col-md-4 border-end` with a wrapper using `observability-container` and `observability-grid`, with two sections (`observability-sidebar` and `observability-content`).
- `<h5>Upload & Query</h5>` → `<div className="observability-section-title">Upload & Query</div>`
- `<div className="upload-box ...">` → `<div className="observability-upload-box ...">`, keep click handler and dynamic `uploading` class when `isUploading`.
- `<label className="form-label">` → `<label className="observability-label">`
- `<textarea className="form-control">` → `<textarea className="observability-textarea">`
- `<button className="btn btn-primary btn-sm w-100 mb-3">` → `<button className="observability-btn">`
- `<input type="range" className="form-range">` → `<input type="range" className="observability-range">`
- `<div className="form-check">` → `<label className="observability-check">` (wrap input + label text; remove separate `<label htmlFor="rerankToggle">`).
- Right column heading (`h6`) → `<div className="observability-section-title">`
- Empty state `<p className="text-muted">` → `<p className="observability-empty">`
- Alert `<div className="alert alert-warning">` → `<div className="observability-alert">`
- ChunkCard:
  - `<div className={\`card mb-2 ${highlight ? "border-primary" : ""}\`}>` → `<div className={\`observability-card ${highlight ? "highlight" : ""}\`}>`
  - `<div className="card-body p-2">` → remove, rely on observability-card padding.
  - `<p className="card-text small">` → `<p className="observability-card-text">` (style: `font-size: 0.875rem; color: var(--text-primary); line-height: 1.5; margin: 0;`)
  - `<div className="d-flex gap-2 small text-muted">` → `<div className="observability-card-meta">`
- Metric cards:
  - Replace Bootstrap `card text-center` with `observability-card observability-metric`:
    - `.observability-metric { text-align: center; }`
    - `.observability-metric-label { text-transform: uppercase; font-size: 0.6875rem; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: var(--space-xs); }`
    - `.observability-metric-value { font-size: 1.125rem; font-weight: 600; color: var(--text-primary); }`
- Remove all remaining Bootstrap utility classes (`d-flex`, `gap-*`, `small`, `text-muted`, `border-end`, `bg-light`, `mb-3`, `p-2`, `w-100`, etc.) from the panel markup. Use custom CSS for spacing and layout.
- Keep the `ChunkCard` subcomponent structure; only change class names.

## Acceptance Criteria
1. `globals.css` contains a new, self-contained section for observability panel styles using the existing design tokens.
2. `ObservabilityPanel.tsx` no longer uses Bootstrap classes (`btn`, `card`, `form-*`, `bg-light`, `border-top`, `text-muted`, `container-fluid`, `row`, `col-md-*`).
3. The panel renders a two-column layout on desktop and a stacked layout on mobile.
4. The panel uses the warm gold accent (`#B8860B`), cream backgrounds, and rounded corners consistent with the chat UI.
5. Existing tests for `ObservabilityPanel.test.tsx` still pass.
6. `next build` or `npm run build` (or `npm run lint` at minimum) completes without errors introduced by these changes.

## Files to Modify
- `services/nextjs-app/src/app/globals.css`
- `services/nextjs-app/src/components/ObservabilityPanel.tsx`

## Out of Scope
- Functional behavior changes (props, data flow, API calls).
- Adding new observability features.
- Modifying `custom-bootstrap.css` or other components.
