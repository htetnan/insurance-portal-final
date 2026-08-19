package com.insurance.portal.controller;

import com.insurance.portal.dto.AdminScheduleEntryResponse;
import com.insurance.portal.model.Payment;
import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.model.enums.ApplicationStatus;
import com.insurance.portal.repository.PaymentRepository;
import com.insurance.portal.repository.PolicyApplicationRepository;
import com.insurance.portal.util.PremiumScheduleUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/admin/premium-schedule")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPremiumScheduleController {

    private final PolicyApplicationRepository appRepo;
    private final PaymentRepository paymentRepo;

    /**
     * Returns one schedule entry per active (APPROVED) application that has
     * a recurring payment frequency set. Entry shows the current/most-urgent period.
     *
     * Optional filter: ?status=OVERDUE | DUE | PENDING_VERIFICATION | PAID | ALL (default)
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<AdminScheduleEntryResponse> getSchedule(
            @RequestParam(required = false, defaultValue = "ALL") String status) {

        List<PolicyApplication> apps = appRepo.findAllByStatus(ApplicationStatus.APPROVED);

        return apps.stream()
                .filter(app -> app.getInsurancePackage() != null
                        && app.getInsurancePackage().getPaymentIntervalMonths() != null
                        && app.getInsurancePackage().getPaymentIntervalMonths() > 0)
                .map(app -> {
                    List<Payment> payments = paymentRepo.findAllByApplication_Id(app.getId());
                    return PremiumScheduleUtil.buildAdminEntry(app, payments);
                })
                .filter(Objects::nonNull)
                .filter(entry -> "ALL".equalsIgnoreCase(status)
                        || entry.getScheduleStatus().equalsIgnoreCase(status))
                .sorted((a, b) -> {
                    // Sort: OVERDUE first, then DUE, then PENDING_VERIFICATION, then rest
                    int oa = statusOrder(a.getScheduleStatus());
                    int ob = statusOrder(b.getScheduleStatus());
                    if (oa != ob) return Integer.compare(oa, ob);
                    if (a.getDueDate() != null && b.getDueDate() != null)
                        return a.getDueDate().compareTo(b.getDueDate());
                    return 0;
                })
                .toList();
    }

    private int statusOrder(String s) {
        return switch (s == null ? "" : s) {
            case "OVERDUE" -> 0;
            case "DUE" -> 1;
            case "PENDING_VERIFICATION" -> 2;
            case "UPCOMING" -> 3;
            case "PAID" -> 4;
            default -> 5;
        };
    }
}
