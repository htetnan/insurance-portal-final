---
name: MySQL and file storage
description: Production storage boundary for the insurance portal
---

Business records belong in MySQL. Uploaded documents remain in persistent file/object storage, while MySQL stores their protected references and metadata; do not put large PDFs or images in BLOB columns by default.

**Why:** Insurance documents and screenshots can make database backups and queries unnecessarily large, while separating binary storage keeps recovery and scaling manageable.

**How to apply:** Keep the configured file storage directory persistent and backed up together with MySQL. Use the shared secure file resolver for every upload/download endpoint.