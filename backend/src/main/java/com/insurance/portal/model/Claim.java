package com.insurance.portal.model;

import com.insurance.portal.model.enums.ClaimStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PolicyApplication application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User agent;

    @Column(name = "claim_type", nullable = false)
    private String claimType;

    @Column(nullable = false, precision = 20, scale = 2)
    private BigDecimal amount;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "incident_date")
    private LocalDate incidentDate;

    @Column(name = "documents_path")
    private String documentsPath;

    /**
     * JSON: dynamic claim form submission data.
     * Format: { "fieldId": "value", ... }
     * For IMAGE_UPLOAD/PDF_UPLOAD fields: value is the server-stored file path.
     */
    @Column(name = "form_data", columnDefinition = "TEXT")
    private String formData;

    /** Browser-drawn signature captured when the assigned agent verifies the claim. */
    @Column(name = "agent_signature", columnDefinition = "LONGTEXT")
    private String agentSignature;

    @Column(name = "agent_signed_at")
    private LocalDateTime agentSignedAt;

    /** Browser-drawn signature captured when an admin approves the claim. */
    @Column(name = "admin_signature", columnDefinition = "LONGTEXT")
    private String adminSignature;

    @Column(name = "admin_signed_at")
    private LocalDateTime adminSignedAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ClaimStatus status = ClaimStatus.PENDING;

    @Column(name = "agent_note", columnDefinition = "TEXT")
    private String agentNote;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "revision_deadline")
    private LocalDateTime revisionDeadline;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
