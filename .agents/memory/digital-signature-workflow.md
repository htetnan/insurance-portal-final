---
name: Digital signature workflow
description: Role-specific signature storage, validation, reset behavior, and PDF rendering for applications and claims
---

Agent and admin signatures are separate from the customer's `formData.__signature`: agent signatures certify review, while admin signatures certify approval. Both are validated as browser-generated image data before persistence, and all review signatures are cleared when a customer revises and resubmits.

**Why:** Keeping role signatures separate preserves audit meaning and prevents a revised submission from inheriting approval evidence from an earlier version.

**How to apply:** Require the role signature in both the UI and backend endpoint, expose it in DTOs for review displays, and render stored images—not only status text—in generated PDFs.