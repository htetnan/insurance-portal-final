package com.insurance.portal.controller;

import com.insurance.portal.model.FormField;
import com.insurance.portal.model.FormTemplate;
import com.insurance.portal.model.InsurancePackage;
import com.insurance.portal.model.enums.FieldType;
import com.insurance.portal.model.enums.FormType;
import com.insurance.portal.repository.FormTemplateRepository;
import com.insurance.portal.repository.InsurancePackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class FormTemplateController {

    private final FormTemplateRepository templateRepo;
    private final InsurancePackageRepository packageRepo;

    // ── Admin: list all forms for a specific package ─────────────────
    @GetMapping("/admin/packages/{packageId}/forms")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFormsForPackage(@PathVariable Long packageId) {
        return templateRepo.findAllByInsurancePackageId(packageId).stream()
                .map(this::toMap).toList();
    }

    // ── Admin: list all forms (all packages) ─────────────────────────
    @GetMapping("/admin/forms")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllForms() {
        return templateRepo.findAll().stream()
                .sorted(Comparator.comparing(FormTemplate::getCreatedAt).reversed())
                .map(this::toMap).toList();
    }

    // ── Admin: create form for a specific package ─────────────────────
    @PostMapping("/admin/packages/{packageId}/forms")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> create(@PathVariable Long packageId, @RequestBody Map<String, Object> req) {
        InsurancePackage pkg = packageRepo.findById(packageId)
                .orElseThrow(() -> new RuntimeException("Package not found"));
        FormType formType = FormType.valueOf(req.get("formType").toString());

        if (templateRepo.existsByInsurancePackageIdAndFormType(packageId, formType)) {
            return ResponseEntity.status(409).body(Map.of(
                    "message", "A " + formType.name() + " form already exists for this package. Delete or edit the existing one."));
        }
        FormTemplate template = new FormTemplate();
        template.setInsurancePackage(pkg);
        applyRequest(template, req);
        return ResponseEntity.ok(toMap(templateRepo.save(template)));
    }

    // ── Admin: update a specific form ─────────────────────────────────
    @PutMapping("/admin/forms/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        FormTemplate template = templateRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        template.getFields().clear();
        templateRepo.saveAndFlush(template);
        applyRequest(template, req);
        return ResponseEntity.ok(toMap(templateRepo.save(template)));
    }

    // ── Admin: delete a specific form ─────────────────────────────────
    @DeleteMapping("/admin/forms/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        templateRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Form deleted"));
    }

    // ── Public/Authenticated: get active form for a package + formType ─
    // Used by customers when applying and by all roles when viewing
    @GetMapping("/forms/public")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPublic(
            @RequestParam(required = false) Long packageId,
            @RequestParam String formType) {
        if (packageId == null) return ResponseEntity.badRequest().body(Map.of("message", "packageId is required"));
        return templateRepo.findFirstByInsurancePackageIdAndFormTypeAndActiveTrue(packageId, FormType.valueOf(formType))
                .map(t -> ResponseEntity.ok(toMap(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Helpers ─────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private void applyRequest(FormTemplate template, Map<String, Object> req) {
        template.setName(req.get("name").toString());
        template.setFormType(FormType.valueOf(req.get("formType").toString()));
        template.setDescription(req.containsKey("description") && req.get("description") != null
                ? req.get("description").toString() : null);
        template.setActive(!req.containsKey("active") || Boolean.TRUE.equals(req.get("active")));

        List<Map<String, Object>> fieldList = req.containsKey("fields") && req.get("fields") != null
                ? (List<Map<String, Object>>) req.get("fields") : List.of();

        for (int i = 0; i < fieldList.size(); i++) {
            Map<String, Object> fd = fieldList.get(i);
            FormField field = new FormField();
            field.setTemplate(template);
            field.setFieldLabel(fd.get("fieldLabel").toString());
            field.setFieldType(FieldType.valueOf(fd.get("fieldType").toString()));
            field.setRequired(Boolean.TRUE.equals(fd.get("required")));
            field.setSortOrder(i);
            if (fd.containsKey("fieldOptions") && fd.get("fieldOptions") != null) {
                field.setFieldOptions(fd.get("fieldOptions").toString());
            }
            template.getFields().add(field);
        }
    }

    public Map<String, Object> toMap(FormTemplate t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getName());
        if (t.getInsurancePackage() != null) {
            m.put("packageId", t.getInsurancePackage().getId());
            m.put("packageName", t.getInsurancePackage().getName());
            m.put("insuranceType", t.getInsurancePackage().getType());
        }
        m.put("formType", t.getFormType().name());
        m.put("description", t.getDescription());
        m.put("active", t.isActive());
        m.put("createdAt", t.getCreatedAt());
        m.put("fields", t.getFields().stream().map(f -> {
            Map<String, Object> fm = new LinkedHashMap<>();
            fm.put("id", f.getId());
            fm.put("fieldLabel", f.getFieldLabel());
            fm.put("fieldType", f.getFieldType().name());
            fm.put("required", f.isRequired());
            fm.put("sortOrder", f.getSortOrder());
            fm.put("fieldOptions", f.getFieldOptions());
            return fm;
        }).toList());
        return m;
    }
}
