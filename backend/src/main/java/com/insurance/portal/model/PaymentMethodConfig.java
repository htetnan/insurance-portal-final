package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_method_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethodConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Human-readable name shown in UI — e.g. "KBZ Pay" */
    @Column(nullable = false)
    private String name;

    /** Unique code used as the paymentMethod field in Payment — e.g. "KBZ_PAY" */
    @Column(name = "method_key", nullable = false, unique = true)
    private String methodKey;

    /** Hex brand colour — e.g. "#e2231a" */
    private String color;

    /** Absolute path of the uploaded logo image (optional) */
    @Column(name = "logo_path")
    private String logoPath;

    /** Absolute path of the uploaded QR-code image */
    @Column(name = "qr_code_path")
    private String qrCodePath;

    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
