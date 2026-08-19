---
name: JSON array in TEXT column for multi-file paths
description: Convention used in this codebase to store a list of file paths in a single TEXT column without a join table.
---

## Rule
Multi-file upload fields use a TEXT column (e.g. `documents_path`) that stores a JSON array string like `["uploads/applications/abc.png","uploads/applications/def.pdf"]`. Use `FileStorageUtil.toJsonArray(paths)` to serialize and `FileStorageUtil.fromJsonArray(json)` to deserialize.

**Why:** Consistent with the existing `commonInfo`/`extraInfo` JSON-string pattern in this codebase. Avoids new join tables for a simple ordered list of paths. `ddl-auto=update` picks up column additions automatically.

**How to apply:**
- Column type: `TEXT` (not VARCHAR — JSON arrays can be long with many files).
- `documentCount` in DTOs is derived as `FileStorageUtil.fromJsonArray(entity.getDocumentsPath()).size()` — never store count separately.
- Frontend uses `documentCount` to build indexed document URLs: `Array.from({ length: count }, (_, i) => \`/agent/applications/${id}/documents/${i}\`)`.
- Backend streaming endpoint resolves index → path via `FileStorageUtil.fromJsonArray(...)`.
