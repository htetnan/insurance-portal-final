package com.insurance.portal.model.enums;

public enum FieldType {
    LABEL,        // Static display text / section header
    NAME,         // Auto-filled full name from profile — read-only
    EMAIL,        // Auto-filled email from profile — read-only
    PHONE,        // Phone number input
    TEXT,         // Single-line text input
    TEXTAREA,     // Multi-line text input
    CHECKBOX,     // Boolean checkbox (or multi-option checklist)
    DATE,         // Date picker
    NRC,          // Myanmar NRC number format
    IMAGE_UPLOAD, // Image file upload
    PDF_UPLOAD    // PDF file upload
}
