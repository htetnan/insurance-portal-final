package com.insurance.portal.dto;

import com.insurance.portal.model.InsurancePackage;
import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.util.FileStorageUtil;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Data
public class ApplicationResponse {
    private Long id;
    private String customerName;
    private String customerEmail;
    private Long customerId;
    private String packageName;
    private String packageType;
    private Long packageId;
    private String agentName;
    private Long agentId;
    private BigDecimal coverageAmount;
    private Integer duration;
    private String status;
    private String notes;
    private String agentNote;
    private String adminNote;
    private String agentSignature;
    private LocalDateTime agentSignedAt;
    private String adminSignature;
    private LocalDateTime adminSignedAt;
    private String commonInfo;
    private String extraInfo;
    private String formData;
    private String policyNumber;
    private String riskLevel;
    private BigDecimal premiumAmount;
    private String paymentFrequency;
    private Integer paymentIntervalMonths;
    private BigDecimal installmentAmount;
    private int totalInstallments;
    private int documentCount;
    private LocalDateTime createdAt;

    public static ApplicationResponse from(PolicyApplication app) {
        ApplicationResponse dto = new ApplicationResponse();
        dto.setId(app.getId());
        if (app.getCustomer() != null) {
            dto.setCustomerId(app.getCustomer().getId());
            dto.setCustomerName(app.getCustomer().getName());
            dto.setCustomerEmail(app.getCustomer().getEmail());
        }
        if (app.getInsurancePackage() != null) {
            InsurancePackage pkg = app.getInsurancePackage();
            dto.setPackageId(pkg.getId());
            dto.setPackageName(pkg.getName());
            dto.setPackageType(pkg.getType());
            dto.setPaymentFrequency(pkg.getPaymentFrequency());
            dto.setPaymentIntervalMonths(pkg.getPaymentIntervalMonths());
            // Calculate installment amount
            if (pkg.getPaymentIntervalMonths() != null && pkg.getPaymentIntervalMonths() > 0
                    && app.getDuration() != null && app.getPremiumAmount() != null) {
                int total = (app.getDuration() * 12) / pkg.getPaymentIntervalMonths();
                if (total > 0) {
                    dto.setTotalInstallments(total);
                    dto.setInstallmentAmount(app.getPremiumAmount()
                            .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP));
                }
            }
            if (dto.getTotalInstallments() == 0) {
                dto.setTotalInstallments(1);
                dto.setInstallmentAmount(app.getPremiumAmount());
            }
        }
        if (app.getAgent() != null) {
            dto.setAgentId(app.getAgent().getId());
            dto.setAgentName(app.getAgent().getName());
        }
        dto.setCoverageAmount(app.getCoverageAmount());
        dto.setDuration(app.getDuration());
        dto.setStatus(app.getStatus().name());
        dto.setNotes(app.getNotes());
        dto.setAgentNote(app.getAgentNote());
        dto.setAdminNote(app.getAdminNote());
        dto.setAgentSignature(app.getAgentSignature());
        dto.setAgentSignedAt(app.getAgentSignedAt());
        dto.setAdminSignature(app.getAdminSignature());
        dto.setAdminSignedAt(app.getAdminSignedAt());
        dto.setCommonInfo(app.getCommonInfo());
        dto.setExtraInfo(app.getExtraInfo());
        dto.setFormData(app.getFormData());
        dto.setPolicyNumber(app.getPolicyNumber());
        dto.setRiskLevel(app.getRiskLevel());
        dto.setPremiumAmount(app.getPremiumAmount());
        dto.setDocumentCount(FileStorageUtil.fromJsonArray(app.getDocumentsPath()).size());
        dto.setCreatedAt(app.getCreatedAt());
        return dto;
    }
}
