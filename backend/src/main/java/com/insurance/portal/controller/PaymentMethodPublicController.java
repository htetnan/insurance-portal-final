package com.insurance.portal.controller;

import com.insurance.portal.repository.PaymentMethodConfigRepository;
import com.insurance.portal.util.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Public (no-auth) endpoints for payment method metadata and QR / logo images.
 * Paths are whitelisted in SecurityConfig.
 */
@RestController
@RequestMapping("/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodPublicController {

    private final PaymentMethodConfigRepository repo;

    /** Returns all active payment methods (no file paths — only metadata) */
    @GetMapping("/public")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublic() {
        return repo.findAllByActiveTrueOrderByIdAsc().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",        c.getId());
            m.put("name",      c.getName());
            m.put("methodKey", c.getMethodKey());
            m.put("color",     c.getColor());
            m.put("hasLogo",   c.getLogoPath() != null);
            m.put("hasQr",     c.getQrCodePath() != null);
            return m;
        }).toList();
    }

    /** Streams the QR-code image for a payment method */
    @GetMapping("/{id}/qr")
    public ResponseEntity<?> serveQr(@PathVariable Long id) {
        return repo.findById(id)
                .map(c -> c.getQrCodePath() != null
                        ? FileStorageUtil.streamFile(c.getQrCodePath())
                        : ResponseEntity.notFound().<Object>build())
                .orElse(ResponseEntity.notFound().build());
    }

    /** Streams the logo image for a payment method */
    @GetMapping("/{id}/logo")
    public ResponseEntity<?> serveLogo(@PathVariable Long id) {
        return repo.findById(id)
                .map(c -> c.getLogoPath() != null
                        ? FileStorageUtil.streamFile(c.getLogoPath())
                        : ResponseEntity.notFound().<Object>build())
                .orElse(ResponseEntity.notFound().build());
    }
}
