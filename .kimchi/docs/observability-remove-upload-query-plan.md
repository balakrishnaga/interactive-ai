# Plan: Remove Upload & Query / Test Query from Observability Panel

## Goal
Remove the redundant upload and test-query controls from `ObservabilityPanel`. Document upload and search are already handled by the main chat/insight flow (`ChatBox`), so the observability panel should only expose the retrieval settings (Top-K, rerank) and the trace visualization.

## Current State
- `ObservabilityPanel` receives props: `observability`, `topK`, `setTopK`, `enableRerank`, `setEnableRerank`, `onRunRetrieval?`, `isUploading?`, `onUploadClick?`.
- It renders:
  - A left sidebar titled **Upload & Query** containing:
    - Upload box (`onUploadClick` / `isUploading`)
    - Test Query textarea + **Run Retrieval** button (`onRunRetrieval`)
    - Top-K slider
    - Enable reranking checkbox
  - A right content area showing the observability trace.
- `ChatBox` passes upload/search handlers to `ObservabilityPanel`:
  - `onUploadClick={() => fileInputRef.current?.click()}`
  - `isUploading={isUploading}`
  - `onRunRetrieval={(query) => sendMessage(query)}`
- `ChatBox` already has its own upload input, insight-mode landing upload area, and chat input that calls `sendMessage`, which populates `observability` state.

## Target State
- `ObservabilityPanel` props are reduced to:
  - `observability`
  - `topK`
  - `setTopK`
  - `enableRerank`
  - `setEnableRerank`
- The left sidebar is renamed/repurposed to **Retrieval Settings** and contains only:
  - Top-K slider
  - Enable reranking checkbox
- Upload box, Test Query textarea, Run Retrieval button, and related props are removed.
- `ChatBox` no longer passes `onUploadClick`, `isUploading`, `onRunRetrieval` to `ObservabilityPanel`.
- Unused CSS classes for the removed controls are removed from `globals.css`:
  - `.observability-upload-box`
  - `.observability-textarea`
  - `.observability-btn`
- Tests are updated to:
  - Remove the `onRunRetrieval` test.
  - Remove props no longer accepted.
  - Keep the existing "renders chunks and metrics" test.

## Chunks

### Chunk 1 — Update `ObservabilityPanel.tsx` props and UI
**Complexity:** simple
**Files:** `services/nextjs-app/src/components/ObservabilityPanel.tsx`

1. Remove from the `Props` interface:
   - `onRunRetrieval?: (query: string) => void`
   - `isUploading?: boolean`
   - `onUploadClick?: () => void`
2. Remove the corresponding destructured parameters from the component signature.
3. Remove the local `query` state (`useState("")`).
4. In the left column:
   - Change section title from **Upload & Query** to **Retrieval Settings**.
   - Remove the upload box element.
   - Remove the Test Query textarea and label.
   - Remove the **Run Retrieval** button.
   - Keep Top-K slider and Enable reranking checkbox.
5. Ensure no remaining references to `query`, `onRunRetrieval`, `isUploading`, or `onUploadClick`.
6. Remove any Bootstrap utility classes that may remain after the previous CSS refactor (e.g., `d-flex`, `gap-2`, `small`, `text-muted`). The component should use only the custom `observability-*` classes.

### Chunk 2 — Update `ChatBox.tsx` caller
**Complexity:** simple
**Files:** `services/nextjs-app/src/components/ChatBox.tsx`

1. At the `ObservabilityPanel` call site, remove the props:
   - `onUploadClick={() => fileInputRef.current?.click()}`
   - `isUploading={isUploading}`
   - `onRunRetrieval={(query) => sendMessage(query)}`
2. Keep: `observability`, `topK`, `setTopK`, `enableRerank`, `setEnableRerank`.
3. No other changes to `ChatBox` behavior.

### Chunk 3 — Update tests
**Complexity:** simple
**Files:** `services/nextjs-app/src/components/__tests__/ObservabilityPanel.test.tsx`

1. Remove the test "calls onRunRetrieval with query".
2. Update the remaining render calls to omit `onRunRetrieval`, `isUploading`, `onUploadClick` props.
3. Keep the "renders chunks and metrics" test as-is (it does not use removed props).

### Chunk 4 — Clean up unused CSS
**Complexity:** simple
**Files:** `services/nextjs-app/src/app/globals.css`

1. Remove CSS rules that are no longer used by `ObservabilityPanel`:
   - `.observability-panel .observability-upload-box`
   - `.observability-panel .observability-upload-box:hover`
   - `.observability-panel .observability-upload-box.uploading`
   - `.observability-panel .observability-textarea`
   - `.observability-panel .observability-btn`
   - `.observability-panel .observability-btn:hover:not(:disabled)`
   - `.observability-panel .observability-btn:disabled`
2. Keep all other observability styles (container, grid, sidebar, content, section title, label, input, range, card, alert, check, metric grid, empty, divider, responsive queries).

## Acceptance Criteria
1. `ObservabilityPanel.tsx` no longer accepts `onRunRetrieval`, `isUploading`, or `onUploadClick` props.
2. The panel renders only **Retrieval Settings** (Top-K slider + rerank toggle) in the left area and the trace in the right area.
3. `ChatBox.tsx` no longer passes upload/search handlers to `ObservabilityPanel`.
4. `ObservabilityPanel.test.tsx` is updated: no `onRunRetrieval` test, no removed props in render calls.
5. `globals.css` no longer contains styles for removed elements (upload box, textarea, primary button).
6. `npx jest ObservabilityPanel.test.tsx` passes.
7. `npm run lint` and `npx tsc --noEmit` complete without new errors in modified files.

## Files to Modify
- `services/nextjs-app/src/components/ObservabilityPanel.tsx`
- `services/nextjs-app/src/components/ChatBox.tsx`
- `services/nextjs-app/src/components/__tests__/ObservabilityPanel.test.tsx`
- `services/nextjs-app/src/app/globals.css`

## Out of Scope
- Changing the upload flow in `ChatBox`.
- Changing the `/api/chat` or `/api/upload` API routes.
- Adding new features to observability.
