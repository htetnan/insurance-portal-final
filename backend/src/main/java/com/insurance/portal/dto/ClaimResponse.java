package com.insurance.portal.dto;

import com.insurance.portal.model.Claim;
import com.insurance.portal.util.FileStorageUtil;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ClaimResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private Long applicationId;
    private Long packageId;
    private String policyName;
    private java.math.BigDecimal coverageAmount;
    private String agentName;
    private String claimType;
    private BigDecimal amount;
    private String description;
    private LocalDate incidentDate;
    private String status;
    private String agentNote;
    private String adminNote;
    private String agentSignature;
    private LocalDateTime agentSignedAt;
    private String adminSignature;
    private LocalDateTime adminSignedAt;
    private String formData;
    private int documentCount;
    private LocalDateTime createdAt;

    public static ClaimResponse from(Claim claim) {
        ClaimResponse dto = new ClaimResponse();
        dto.setId(claim.getId());
        if (claim.getCustomer() != null) {
            dto.setCustomerId(claim.getCustomer().getId());
            dto.setCustomerName(claim.getCustomer().getName());
        }
        if (claim.getApplication() != null) {
            dto.setApplicationId(claim.getApplication().getId());
            dto.setCoverageAmount(claim.getApplication().getCoverageAmount());
            if (claim.getApplication().getInsurancePackage() != null) {
                dto.setPackageId(claim.getApplication().getInsurancePackage().getId());
                dto.setPolicyName(claim.getApplication().getInsurancePackage().getName());
            }
        }
        if (claim.getAgent() != null) {
            dto.setAgentName(claim.getAgent().getName());
        }
        dto.setClaimType(claim.getClaimType());
        dto.setAmount(claim.getAmount());
        dto.setDescription(claim.getDescription());
        dto.setIncidentDate(claim.getIncidentDate());
        dto.setStatus(claim.getStatus().name());
        dto.setAgentNote(claim.getAgentNote());
        dto.setAdminNote(claim.getAdminNote());
        dto.setAgentSignature(claim.getAgentSignature());
        dto.setAgentSignedAt(claim.getAgentSignedAt());
        dto.setAdminSignature(claim.getAdminSignature());
        dto.setAdminSignedAt(claim.getAdminSignedAt());
        dto.setFormData(claim.getFormData());
        dto.setDocumentCount(FileStorageUtil.fromJsonArray(claim.getDocumentsPath()).size());
        dto.setCreatedAt(claim.getCreatedAt());
        return dto;
    }
}
