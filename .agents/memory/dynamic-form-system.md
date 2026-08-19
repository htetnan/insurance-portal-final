---
name: Dynamic Form System Architecture
description: How the package-centric form builder, submission, viewing, and PDF export work end-to-end
---

## Core design

- `form_templates` owns a `package_id` FK (not insuranceType string) + UNIQUE(package_id, form_type)
  — so each InsurancePackage has exactly ONE APPLICATION form and ONE CLAIM form.
- `form_fields.field_options` TEXT: JSON array of strings for CHECKBOX options, e.g. `["Yes","No"]`.
- `FieldType` enum: LABEL, TEXT, TEXTAREA, CHECKBOX, IMAGE_UPLOAD, PDF_UPLOAD
- `policy_applications.form_data` and `claims.form_data`: TEXT column storing JSON `{fieldId: value}`.
  - For file-upload fields: value is the server file path (saved by FileStorageUtil).
  - For CHECKBOX fields: value is a JSON array string `["OptionA","OptionB"]`.

## API endpoints added

### Form builder (admin only)
- `GET /admin/packages/{packageId}/forms` — list forms for a package
- `POST /admin/packages/{packageId}/forms` — create form (409 if type already exists)
- `PUT /admin/forms/{id}` — update (clears+rebuilds fields)
- `DELETE /admin/forms/{id}` — delete
- `GET /forms/public?packageId=&formType=` — fetch active form (used by customers, no role guard)

### Form file serving (per role, with ownership check)
- `GET /{role}/applications/{id}/form-file/{fieldId}` — serve file at path stored in formData[fieldId]
- `GET /{role}/claims/{id}/form-file/{fieldId}` — same for claims
- Available for admin, agent (ownership-checked), customer (ownership-checked)

### PDF generation
- `GET /{role}/applications/{id}/pdf` and `GET /{role}/claims/{id}/pdf`
- Uses itext7-core 7.2.5 (already in pom.xml as itext7-core)
- Fetches the matching FormTemplate, renders all field labels+values into a styled two-column table

## Frontend components

- `FormDetailModal` (components/FormDetailModal.jsx): shared across all 6 pages (admin/agent/customer × apps/claims).
  - Fetches template via `/forms/public`, parses `item.formData` JSON, renders each field.
  - LABEL fields get a full-width section header row.
  - CHECKBOX fields render as colored pill badges.
  - FILE fields get a "View Image/File" button that fetches via `/{role}/…/form-file/{fieldId}` blob.
  - Download PDF button hits the role-specific PDF endpoint.
- `AdminFormBuilderPage`: two-panel (package list ← → form editor). One form builder for APPLICATION, one for CLAIM.
- `ManagePackagesPage`: shows ✓/✗ APPLICATION and CLAIM form badges per package row; "Forms" button navigates to form-builder.
- `ApplyPolicyPage`: 3-step wizard (select plan → fill dynamic form → review).
- `SubmitClaimPage`: fetches CLAIM form template for the selected policy's packageId.

## Submission flow

1. Customer submits multipart/form-data with `formData` JSON string + `file_<fieldId>` file parts.
2. `CustomerController.processFormFileUploads()` reads the JSON, saves each file via FileStorageUtil, replaces the placeholder value with the saved path.
3. Final `formData` JSON (with file paths) stored in `policy_applications.form_data`.

## Why package FK instead of type string
- Allows different forms per plan (e.g. two LIFE plans can have different application forms)
- Enforced uniqueness at DB level (UNIQUE constraint)
- Enables precise form lookup: `findByInsurancePackageIdAndFormType`

## JPA ddl-auto=update note
Old `insurance_type` VARCHAR column remains in `form_templates` table (harmless). JPA adds `package_id` alongside it. Schema.sql uses `CREATE TABLE IF NOT EXISTS` so it doesn't drop+recreate.
