## Review: Remove Upload & Query / Test Query controls from ObservabilityPanel

### Verdict

APPROVED

### Summary

- `ObservabilityPanel.tsx` no longer accepts `onRunRetrieval`, `isUploading`, or `onUploadClick` props.
- The left sidebar now shows only **Retrieval Settings** with the Top-K slider and rerank toggle.
- `ChatBox.tsx` no longer passes upload/search handlers to `ObservabilityPanel`.
- `ObservabilityPanel.test.tsx` is updated: the `onRunRetrieval` test is removed and render calls no longer include removed props.
- `globals.css` does not contain `.observability-upload-box`, `.observability-textarea`, or `.observability-btn` rules.

### Verification

- `npx jest ObservabilityPanel.test.tsx --forceExit`  
  PASS — `renders chunks and metrics`
- `npx tsc --noEmit`  
  No output / no errors.
- `npm run lint`  
  Exits with errors, but all errors are pre-existing and located in unmodified files (`jest.config.js`, `jest.setup.js`, `app/api/*`, `MessageContent.tsx`, `lib/db.ts`, `lib/llm/huggingface.ts`, `lib/rag.ts`). None of the four modified files introduce new lint errors.
