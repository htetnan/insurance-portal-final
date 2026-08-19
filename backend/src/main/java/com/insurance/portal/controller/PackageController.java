package com.insurance.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurance.portal.dto.PackageResponse;
import com.insurance.portal.model.InsurancePackage;
import com.insurance.portal.repository.InsurancePackageRepository;
import com.insurance.portal.repository.InsuranceTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class PackageController {

    private final InsurancePackageRepository packageRepository;
    private final InsuranceTypeRepository insuranceTypeRepository;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final long PUBLIC_CACHE_TTL_MS = 60_000L;
    private volatile long packagesCacheAt = 0L;
    private volatile long typesCacheAt = 0L;
    private volatile List<PackageResponse> cachedPublicPackages = List.of();
    private volatile List<Map<String, Object>> cachedPublicTypes = List.of();

    // Public endpoints - no auth required
    @GetMapping("/packages/public")
    public ResponseEntity<List<PackageResponse>> getPublicPackages() {
        long now = System.currentTimeMillis();
        if (now - packagesCacheAt >= PUBLIC_CACHE_TTL_MS || cachedPublicPackages.isEmpty()) {
            synchronized (this) {
                now = System.currentTimeMillis();
                if (now - packagesCacheAt >= PUBLIC_CACHE_TTL_MS || cachedPublicPackages.isEmpty()) {
                    cachedPublicPackages = packageRepository.findAllByActive(true).stream()
                            .map(PackageResponse::from).toList();
                    packagesCacheAt = now;
                }
            }
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(cachedPublicPackages);
    }

    @GetMapping("/insurance-types/public")
    public ResponseEntity<List<Map<String, Object>>> getPublicInsuranceTypes() {
        long now = System.currentTimeMillis();
        if (now - typesCacheAt >= PUBLIC_CACHE_TTL_MS || cachedPublicTypes.isEmpty()) {
            synchronized (this) {
                now = System.currentTimeMillis();
                if (now - typesCacheAt >= PUBLIC_CACHE_TTL_MS || cachedPublicTypes.isEmpty()) {
                    cachedPublicTypes = insuranceTypeRepository.findAllByOrderByNameAsc().stream()
                        .map(t -> {
                            Map<String, Object> m = new HashMap<>();
                            m.put("id", t.getId());
                            m.put("name", t.getName());
                            m.put("description", t.getDescription() != null ? t.getDescription() : "");
                            m.put("benefits", t.getBenefits() != null ? t.getBenefits() : "");
                            m.put("rules", t.getRules() != null ? t.getRules() : "");
                            return m;
                        }).toList();
                    typesCacheAt = now;
                }
            }
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(cachedPublicTypes);
    }

    // Admin endpoints
    @GetMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMIN')")
    public List<PackageResponse> getAllPackages() {
        return packageRepository.findAll().stream().map(PackageResponse::from).toList();
    }

    @PostMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createPackage(@RequestBody Map<String, Object> req) {
        InsurancePackage pkg = buildPackageFromMap(req, new InsurancePackage());
        PackageResponse saved = PackageResponse.from(packageRepository.save(pkg));
        invalidatePublicPackageCache();
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePackage(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        InsurancePackage pkg = packageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Package not found"));
        buildPackageFromMap(req, pkg);
        PackageResponse saved = PackageResponse.from(packageRepository.save(pkg));
        invalidatePublicPackageCache();
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/admin/packages/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> togglePackage(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        InsurancePackage pkg = packageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Not found"));
        pkg.setActive(Boolean.TRUE.equals(req.get("active")));
        PackageResponse saved = PackageResponse.from(packageRepository.save(pkg));
        invalidatePublicPackageCache();
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePackage(@PathVariable Long id) {
        packageRepository.deleteById(id);
        invalidatePublicPackageCache();
        return ResponseEntity.ok(Map.of("message", "Package deleted"));
    }

    private void invalidatePublicPackageCache() {
        packagesCacheAt = 0L;
        cachedPublicPackages = List.of();
    }

    private InsurancePackage buildPackageFromMap(Map<String, Object> req, InsurancePackage pkg) {
        if (req.containsKey("name"))         pkg.setName((String) req.get("name"));
        if (req.containsKey("type"))         pkg.setType((String) req.get("type"));
        if (req.containsKey("description"))  pkg.setDescription((String) req.get("description"));
        if (req.containsKey("coverageMin"))  pkg.setCoverageMin(toBD(req.get("coverageMin")));
        if (req.containsKey("coverageMax"))  pkg.setCoverageMax(toBD(req.get("coverageMax")));
        if (req.containsKey("active"))       pkg.setActive(Boolean.TRUE.equals(req.get("active")));

        // Duration tiers JSON array [{years, premiumRate}] — also derives premiumRate from first tier
        if (req.containsKey("durationTiers")) {
            Object dt = req.get("durationTiers");
            try {
                pkg.setDurationTiersJson(MAPPER.writeValueAsString(dt));
                if (dt instanceof List<?> list && !list.isEmpty()) {
                    Object first = list.get(0);
                    if (first instanceof Map<?, ?> m && m.containsKey("premiumRate")) {
                        pkg.setPremiumRate(toBD(m.get("premiumRate")));
                    }
                }
            } catch (Exception ignored) {}
        }

        if (req.containsKey("benefits")) {
            Object b = req.get("benefits");
            if (b instanceof List<?> list) pkg.setBenefitsJson(list.stream().map(Object::toString).reduce((a, bc) -> a + "\n" + bc).orElse(""));
            else pkg.setBenefitsJson(b.toString());
        }

        if (req.containsKey("eligibility"))   pkg.setEligibility((String) req.get("eligibility"));
        if (req.containsKey("exclusions"))    pkg.setExclusions((String) req.get("exclusions"));

        // New fields
        if (req.containsKey("paymentFrequency"))     pkg.setPaymentFrequency((String) req.get("paymentFrequency"));
        if (req.containsKey("paymentIntervalMonths") && req.get("paymentIntervalMonths") != null)
            pkg.setPaymentIntervalMonths(((Number) req.get("paymentIntervalMonths")).intValue());
        if (req.containsKey("maxClaimAmount") && req.get("maxClaimAmount") != null)
            pkg.setMaxClaimAmount(toBD(req.get("maxClaimAmount")));
        if (req.containsKey("beneficiaryInfo"))  pkg.setBeneficiaryInfo((String) req.get("beneficiaryInfo"));
        if (req.containsKey("termsAndConditions")) pkg.setTermsAndConditions((String) req.get("termsAndConditions"));
        if (req.containsKey("requiredDocuments")) {
            Object docs = req.get("requiredDocuments");
            try { pkg.setRequiredDocumentsJson(MAPPER.writeValueAsString(docs)); } catch (Exception ignored) {}
        }

        return pkg;
    }

    private BigDecimal toBD(Object v) {
        if (v == null) return null;
        return new BigDecimal(v.toString());
    }
}
