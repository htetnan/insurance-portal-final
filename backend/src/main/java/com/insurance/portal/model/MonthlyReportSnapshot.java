package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_report_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyReportSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private int month; // 1–12

    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;

    private BigDecimal totalRevenue;
    private BigDecimal totalClaimsPaid;
    private BigDecimal netProfit;

    private int totalApplications;
    private int newPolicies;
    private int totalClaims;
    private int totalCustomers;

    /** Absolute path to the archived PDF file on disk */
    @Column(length = 1024)
    private String pdfPath;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
