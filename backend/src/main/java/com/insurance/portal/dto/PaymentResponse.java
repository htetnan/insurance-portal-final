package com.insurance.portal.dto;

import com.insurance.portal.model.Payment;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentResponse {
    private Long id;
    private Long applicationId;
    private String policyNumber;
    private String policyName;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private BigDecimal amount;
    private String paymentType;
    private String paymentMethod;
    private boolean hasScreenshot;
    private String status;
    private String notes;
    private Integer periodNumber;
    private String periodLabel;
    private String verifiedBy;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment p) {
        PaymentResponse dto = new PaymentResponse();
        dto.setId(p.getId());
        if (p.getApplication() != null) {
            dto.setApplicationId(p.getApplication().getId());
            dto.setPolicyNumber(p.getApplication().getPolicyNumber());
            if (p.getApplication().getInsurancePackage() != null) {
                dto.setPolicyName(p.getApplication().getInsurancePackage().getName());
            }
        }
        if (p.getCustomer() != null) {
            dto.setCustomerId(p.getCustomer().getId());
            dto.setCustomerName(p.getCustomer().getName());
            dto.setCustomerEmail(p.getCustomer().getEmail());
        }
        dto.setAmount(p.getAmount());
        dto.setPaymentType(p.getPaymentType());
        dto.setPaymentMethod(p.getPaymentMethod());
        dto.setHasScreenshot(p.getScreenshotPath() != null && !p.getScreenshotPath().isBlank());
        dto.setStatus(p.getStatus().name());
        dto.setNotes(p.getNotes());
        dto.setPeriodNumber(p.getPeriodNumber());
        dto.setPeriodLabel(p.getPeriodLabel());
        dto.setVerifiedBy(p.getVerifiedBy());
        dto.setCreatedAt(p.getCreatedAt());
        return dto;
    }
}
