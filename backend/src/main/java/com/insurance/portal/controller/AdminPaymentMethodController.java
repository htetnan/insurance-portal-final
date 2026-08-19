package com.insurance.portal.controller;

import com.insurance.portal.model.PaymentMethodConfig;
import com.insurance.portal.repository.PaymentMethodConfigRepository;
import com.insurance.portal.util.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * Admin CRUD for payment method configurations (name, colour, logo, QR code).
 * All paths under /admin/** are already secured to ADMIN role by SecurityConfig.
 */
@RestController
@RequestMapping("/admin/payment-methods")
@RequiredArgsConstructor
public class AdminPaymentMethodController {

    private final PaymentMethodConfigRepository repo;

    // ── List ──────────────────────────────────────────────────────────
    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        return repo.findAllByOrderByIdAsc().stream().map(this::toMap).toList();
    }

    // ── Create ────────────────────────────────────────────────────────
    @PostMapping(consumes = "multipart/form-data")
    @Transactional
    public ResponseEntity<?> create(
            @RequestParam String name,
            @RequestParam String methodKey,
            @RequestParam(required = false) String color,
            @RequestParam(required = false, defaultValue = "true") boolean active,
            @RequestParam(required = false) MultipartFile logo,
            @RequestParam(required = false) MultipartFile qrCode) {

        String key = methodKey.trim().toUpperCase().replaceAll("[^A-Z0-9_]", "_");
        if (repo.existsByMethodKey(key))
            return ResponseEntity.badRequest().body(Map.of("message", "Method key '" + key + "' already exists"));

        try {
            String logoPath  = logo   != null && !logo.isEmpty()   ? FileStorageUtil.saveImage(logo,   "payment-logos", "logo")   : null;
            String qrPath    = qrCode != null && !qrCode.isEmpty() ? FileStorageUtil.saveImage(qrCode, "payment-qr",    "qr")     : null;

            PaymentMethodConfig cfg = PaymentMethodConfig.builder()
                    .name(name.trim())
                    .methodKey(key)
                    .color(color != null ? color.trim() : "#1d4ed8")
                    .logoPath(logoPath)
                    .qrCodePath(qrPath)
                    .active(active)
                    .build();
            return ResponseEntity.ok(toMap(repo.save(cfg)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Update ────────────────────────────────────────────────────────
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    @Transactional
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) MultipartFile logo,
            @RequestParam(required = false) MultipartFile qrCode) {

        return repo.findById(id).map(cfg -> {
            try {
                if (name   != null) cfg.setName(name.trim());
                if (color  != null) cfg.setColor(color.trim());
                if (active != null) cfg.setActive(active);

                if (logo != null && !logo.isEmpty()) {
                    FileStorageUtil.deleteFileQuietly(cfg.getLogoPath());
                    cfg.setLogoPath(FileStorageUtil.saveImage(logo, "payment-logos", "logo"));
                }
                if (qrCode != null && !qrCode.isEmpty()) {
                    FileStorageUtil.deleteFileQuietly(cfg.getQrCodePath());
                    cfg.setQrCodePath(FileStorageUtil.saveImage(qrCode, "payment-qr", "qr"));
                }
                return ResponseEntity.ok(toMap(repo.save(cfg)));
            } catch (Exception e) {
                return ResponseEntity.<Object>badRequest().body(Map.of("message", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Toggle active ─────────────────────────────────────────────────
    @PutMapping("/{id}/toggle")
    @Transactional
    public ResponseEntity<?> toggle(@PathVariable Long id) {
        return repo.findById(id).map(cfg -> {
            cfg.setActive(!cfg.isActive());
            return ResponseEntity.ok(toMap(repo.save(cfg)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Delete ────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repo.findById(id).map(cfg -> {
            FileStorageUtil.deleteFileQuietly(cfg.getLogoPath());
            FileStorageUtil.deleteFileQuietly(cfg.getQrCodePath());
            repo.delete(cfg);
            return ResponseEntity.ok(Map.of("success", true));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Serve QR image (admin preview) ────────────────────────────────
    @GetMapping("/{id}/qr")
    public ResponseEntity<?> serveQr(@PathVariable Long id) {
        return repo.findById(id)
                .map(cfg -> cfg.getQrCodePath() != null
                        ? FileStorageUtil.streamFile(cfg.getQrCodePath())
                        : ResponseEntity.notFound().<Object>build())
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Serve logo image (admin preview) ─────────────────────────────
    @GetMapping("/{id}/logo")
    public ResponseEntity<?> serveLogo(@PathVariable Long id) {
        return repo.findById(id)
                .map(cfg -> cfg.getLogoPath() != null
                        ? FileStorageUtil.streamFile(cfg.getLogoPath())
                        : ResponseEntity.notFound().<Object>build())
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Helper ────────────────────────────────────────────────────────
    private Map<String, Object> toMap(PaymentMethodConfig c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        c.getId());
        m.put("name",      c.getName());
        m.put("methodKey", c.getMethodKey());
        m.put("color",     c.getColor());
        m.put("active",    c.isActive());
        m.put("hasLogo",   c.getLogoPath() != null);
        m.put("hasQr",     c.getQrCodePath() != null);
        m.put("createdAt", c.getCreatedAt());
        return m;
    }
}
