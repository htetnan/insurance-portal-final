---
name: iText7 bilingual PDF without Myanmar font
description: How to handle Myanmar Unicode in iText 7 PDFs when no TTF font is available
---

## Rule
Standard iText 7 fonts (`StandardFonts.HELVETICA*`) are Latin-only Type 1 fonts. Any Myanmar Unicode character (U+1000–U+109F range) renders as a placeholder box.

**Why:** The font does not contain Myanmar glyphs. iText needs an embedded TrueType/OpenType font with Myanmar support (e.g. NotoSansMM, Padauk) via `PdfFontFactory.createFont(path, PdfEncodings.IDENTITY_H, true)`.

## How to apply
- In NixOS/Replit: check `/nix/store` or system fonts for `NotoSansMM.ttf` or `Padauk.ttf` before embedding. Path is not guaranteed.
- Pragmatic fallback (used in policy contract PDF): write English as primary text and add Myanmar labels/romanizations **in parentheses** using Helvetica. Example: `"Full Name  (နာမည်အပြည့်)"` — the Latin portion renders, Myanmar shows as boxes but users understand the label.
- True bilingual support requires embedding the font file at a known path and using IDENTITY_H encoding. Gate it on `Files.exists(Path.of(fontPath))` and fall back to Helvetica if missing.
- For production Myanmar PDF support, add a Myanmar TTF to `backend/src/main/resources/fonts/` and reference via classpath: `PdfFontFactory.createFont("fonts/NotoSansMM.ttf", PdfEncodings.IDENTITY_H, EmbeddingStrategy.FORCE_EMBEDDED)`.
