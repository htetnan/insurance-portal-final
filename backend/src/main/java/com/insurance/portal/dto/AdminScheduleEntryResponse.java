package com.insurance.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminScheduleEntryResponse {
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private Long applicationId;
    private String policyNumber;
    private String packageName;
    private String packageType;
    private String paymentFrequency;
    private BigDecimal installmentAmount;
    private int currentPeriodNumber;
    private String periodLabel;
    private LocalDate dueDate;
    /** PAID, PENDING_VERIFICATION, DUE, OVERDUE */
    private String scheduleStatus;
    private Long paymentId;
    /** PENDING, VERIFIED, REJECTED — present when scheduleStatus is PAID or PENDING_VERIFICATION */
    private String paymentStatus;
    private int totalInstallments;
    private long paidInstallments;
}
