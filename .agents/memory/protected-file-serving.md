---
name: Protected file serving via blob fetch
description: How to serve uploaded files through JWT-protected endpoints so the browser can display them without leaking auth tokens via plain <img src>.
---

## Rule
All uploaded files (documents, payment screenshots) are served through role-scoped API endpoints, not as static files. The frontend must fetch them via `api.get(url, { responseType: 'blob' })` and render via `URL.createObjectURL(res.data)`.

**Why:** The JWT auth interceptor only attaches the `Authorization` header to axios requests. A plain `<img src="/api/...">` or `<a href>` carries no auth header and will 401. Blob-fetched object URLs work for both images and PDFs.

**How to apply:**
- Backend: return `ResponseEntity<Resource>` using `FileSystemResource` + set `Content-Type` from `FileStorageUtil.contentTypeFor(path)`.
- Frontend: `const res = await api.get(url, { responseType: 'blob' }); const objUrl = URL.createObjectURL(res.data);` — then assign to `<img src>` or open in new tab.
- Always revoke object URLs on component unmount: `URL.revokeObjectURL(objUrl)` in a `useEffect` cleanup.
- PDFs: detect `res.data.type === 'application/pdf'` and offer an "open in new tab" link instead of embedding inline.

## Codebase pattern
- `DocumentViewerModal.jsx` (reusable) — accepts `urls[]` (relative API paths), fetches all, renders images inline or PDF links.
- `AgentController` streams `/agent/applications/{id}/documents/{index}` and `/agent/claims/{id}/documents/{index}`.
- `AdminPaymentController` streams `/admin/payments/{id}/screenshot`.
