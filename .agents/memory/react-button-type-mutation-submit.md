---
name: React button type=button→submit mutation triggers phantom form submit
description: A conditionally-rendered button that changes type (button→submit) in the same DOM position as its own click handler's re-render can cause the browser to submit the form on the click that toggled it.
---

If a `<form>` has a button whose `type` attribute differs between two branches of a ternary/conditional at the *same tree position* (e.g. view mode renders `<button type="button">Update</button>`, edit mode renders `<button type="submit">Save</button>` in that same slot), clicking the `type="button"` one to *enter* edit mode can make the browser instantly submit the form.

**Why:** React reconciles same-position elements by mutating the existing DOM node rather than replacing it. If the click handler's state update re-renders synchronously within the same event tick, React mutates that already-clicked `<button>`'s `type` attribute from `"button"` to `"submit"` before the browser evaluates the click's default "activation behavior" — so the browser treats the original click as a submit click. Symptom: clicking an "Update"/"Edit" toggle button appears to instantly save-and-revert, or fires a success toast without any real edit ("reflects too fast").

**How to apply:** When a button's `type` changes between the two branches of a mode toggle at the same JSX position, wrap each branch in `<React.Fragment key="...">` with distinct keys (or otherwise give the branches different keys) so React unmounts/remounts fresh DOM nodes instead of mutating the type attribute in place. Diagnosed by scripting a real click+type test with Playwright (installed on demand via `npx playwright install chromium`, browsers cached under `.cache/ms-playwright` in the repl) — static code reading did not reveal it because the JSX for both branches looked individually correct.
