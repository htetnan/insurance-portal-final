package com.insurance.portal.model;

import com.insurance.portal.model.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

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

    @Column(precision = 20, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_type")
    private String paymentType; // PREMIUM, RENEWAL

    /** Mobile payment method used: KBZ_PAY, WAVE_PAY, AYA_PAY */
    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "screenshot_path")
    private String screenshotPath;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    private String notes;

    /** Which installment period this payment covers (1-based). Null for one-time/legacy payments. */
    @Column(name = "period_number")
    private Integer periodNumber;

    /** Human-readable period label, e.g. "2026-07" for monthly, "Year 2" for annual */
    @Column(name = "period_label", length = 30)
    private String periodLabel;

    /** Last 6 digits of the transaction reference number — used for duplicate detection */
    @Column(name = "transaction_last_six_digits", length = 6)
    private String transactionLastSixDigits;

    /** Amount the customer actually transferred — must match the expected installment amount */
    @Column(name = "transaction_amount", precision = 20, scale = 2)
    private BigDecimal transactionAmount;

    @Column(name = "verified_by")
    private String verifiedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
