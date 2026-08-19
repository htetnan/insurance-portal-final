package com.insurance.portal.model;

import com.insurance.portal.model.enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "policy_applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "package_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private InsurancePackage insurancePackage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User agent;

    @Column(name = "coverage_amount", nullable = false, precision = 20, scale = 2)
    private BigDecimal coverageAmount;

    @Column(nullable = false)
    private Integer duration; // years

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes; // customer notes

    @Column(name = "agent_note", columnDefinition = "TEXT")
    private String agentNote;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "revision_deadline")
    private LocalDateTime revisionDeadline;

    /** Risk level calculated at submission: LOW / MEDIUM / HIGH */
    @Column(name = "risk_level", length = 10)
    private String riskLevel;

    /** Auto-generated policy reference number, e.g. POL-LIF-2026-123456 */
    @Column(name = "policy_number", length = 50)
    private String policyNumber;

    /** JSON: customer personal details (name, NRC, DOB, etc.) — legacy field */
    @Column(name = "common_info", columnDefinition = "TEXT")
    private String commonInfo;

    /** JSON: plan-specific fields (beneficiary, vehicle info, etc.) — legacy field */
    @Column(name = "extra_info", columnDefinition = "TEXT")
    private String extraInfo;

    /**
     * JSON: dynamic form submission data.
     * Format: { "fieldId": "value", ... }
     * For IMAGE_UPLOAD/PDF_UPLOAD fields: value is the server-stored file path.
     * For CHECKBOX fields: value is a JSON array of selected option strings.
     */
    @Column(name = "form_data", columnDefinition = "TEXT")
    private String formData;

    /** Browser-drawn signature captured when the assigned agent verifies the form. */
    @Column(name = "agent_signature", columnDefinition = "LONGTEXT")
    private String agentSignature;

    @Column(name = "agent_signed_at")
    private LocalDateTime agentSignedAt;

    /** Browser-drawn signature captured when an admin approves the application. */
    @Column(name = "admin_signature", columnDefinition = "LONGTEXT")
    private String adminSignature;

    @Column(name = "admin_signed_at")
    private LocalDateTime adminSignedAt;

    /** Calculated total premium amount */
    @Column(name = "premium_amount", precision = 20, scale = 2)
    private BigDecimal premiumAmount;

    /** Admin who approved this application (set when status transitions to APPROVED) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User approvedBy;

    /** Timestamp when the application was approved by admin */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** JSON array of server-stored paths for uploaded supporting documents */
    @Column(name = "documents_path", columnDefinition = "TEXT")
    private String documentsPath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "application", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Claim> claims;

    @OneToMany(mappedBy = "application", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Payment> payments;
}
