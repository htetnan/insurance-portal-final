---
name: One-shot effects under React.StrictMode
description: Why a token-consume-on-mount effect can silently "fail" the second time in dev, and how to guard it.
---

React.StrictMode (enabled in this project's `main.jsx`) double-invokes effects on mount in development. Any `useEffect` that performs a one-time, destructive read (e.g. consuming/deleting a single-use token, code, or queue item and setting state from the result) will run twice: the first call succeeds and mutates state, the second call finds the resource already consumed and reports failure — overwriting the correct UI with an error state.

**Why:** Discovered while building email-confirmation-link verification (`ConfirmEmailPage` consuming a one-time token from localStorage) — verification actually succeeded, but the page showed "link invalid" because the effect's second StrictMode pass re-ran the consume logic against an already-deleted token.

**How to apply:** Guard one-shot effects with a `useRef` flag (`if (ranRef.current) return; ranRef.current = true;`) before the destructive logic, whenever an effect consumes/deletes a resource or otherwise isn't safe to run twice. Plain idempotent effects (e.g. read-only fetches) don't need this.
