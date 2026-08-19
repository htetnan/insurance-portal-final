package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "insurance_packages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InsurancePackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // LIFE, HEALTH, VEHICLE, PROPERTY

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "coverage_min", nullable = false, precision = 20, scale = 2)
    private BigDecimal coverageMin;

    @Column(name = "coverage_max", nullable = false, precision = 20, scale = 2)
    private BigDecimal coverageMax;

    @Column(name = "premium_rate", precision = 8, scale = 4)
    private BigDecimal premiumRate; // e.g. 0.0200 = 2% — legacy field; derived from first durationTier

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefitsJson; // JSON array

    @Column(name = "exclusions", columnDefinition = "TEXT")
    private String exclusions; // what is not covered

    @Column(columnDefinition = "TEXT")
    private String eligibility; // eligibility requirements

    @Column(name = "min_policy_term")
    private Integer minPolicyTerm; // minimum policy term in years

    @Column(name = "policy_term")
    private Integer policyTerm; // maximum policy term in years

    // Duration-based premium tiers: JSON array [{years, premiumRate}]
    @Column(name = "duration_tiers", columnDefinition = "TEXT")
    private String durationTiersJson;

    // Payment schedule
    @Column(name = "payment_frequency", length = 20)
    private String paymentFrequency; // MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY

    @Column(name = "payment_interval_months")
    private Integer paymentIntervalMonths; // e.g. 1=monthly, 3=quarterly, 6=half-yearly, 12=yearly

    // Maximum claimable amount
    @Column(name = "max_claim_amount", precision = 20, scale = 2)
    private BigDecimal maxClaimAmount;

    // Who can be a beneficiary
    @Column(name = "beneficiary_info", columnDefinition = "TEXT")
    private String beneficiaryInfo;

    // Required documents for application: JSON array of strings
    @Column(name = "required_documents", columnDefinition = "TEXT")
    private String requiredDocumentsJson;

    // Terms, rules, and policy conditions
    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "insurancePackage", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PolicyApplication> applications;
}
