package com.insurance.portal.util;

import com.insurance.portal.dto.AdminScheduleEntryResponse;
import com.insurance.portal.dto.PremiumScheduleResponse;
import com.insurance.portal.model.Payment;
import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.model.enums.PaymentStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class PremiumScheduleUtil {

    /**
     * Builds the full installment schedule for one application,
     * cross-referenced against actual payment records.
     */
    public static PremiumScheduleResponse buildSchedule(
            PolicyApplication app,
            List<Payment> payments) {

        var pkg = app.getInsurancePackage();
        Integer intervalMonths = pkg != null ? pkg.getPaymentIntervalMonths() : null;
        String frequency = pkg != null ? pkg.getPaymentFrequency() : null;
        BigDecimal totalPremium = app.getPremiumAmount() != null ? app.getPremiumAmount() : BigDecimal.ZERO;
        int durationYears = app.getDuration() != null ? app.getDuration() : 1;

        int totalInstallments;
        BigDecimal installmentAmount;
        if (intervalMonths != null && intervalMonths > 0) {
            totalInstallments = (durationYears * 12) / intervalMonths;
            if (totalInstallments < 1) totalInstallments = 1;
            installmentAmount = totalPremium.divide(BigDecimal.valueOf(totalInstallments), 2, RoundingMode.HALF_UP);
        } else {
            totalInstallments = 1;
            installmentAmount = totalPremium;
        }

        // Index payments by periodNumber (null period → treat as period 1)
        Map<Integer, Payment> paymentByPeriod = payments.stream()
                .filter(p -> p.getPeriodNumber() != null)
                .collect(Collectors.toMap(Payment::getPeriodNumber, p -> p, (a, b) -> {
                    // prefer VERIFIED > PENDING > REJECTED
                    if (a.getStatus() == PaymentStatus.VERIFIED) return a;
                    if (b.getStatus() == PaymentStatus.VERIFIED) return b;
                    if (a.getStatus() == PaymentStatus.PENDING) return a;
                    return b;
                }));

        // Legacy payments without periodNumber → assign to period 1 if not already occupied
        payments.stream()
                .filter(p -> p.getPeriodNumber() == null)
                .findFirst()
                .ifPresent(p -> paymentByPeriod.putIfAbsent(1, p));

        LocalDate startDate = app.getCreatedAt() != null
                ? app.getCreatedAt().toLocalDate()
                : LocalDate.now();
        LocalDate today = LocalDate.now();

        List<PremiumScheduleResponse.InstallmentEntry> schedule = new ArrayList<>();
        long paidCount = 0;

        for (int n = 1; n <= totalInstallments; n++) {
            LocalDate dueDate = intervalMonths != null && intervalMonths > 0
                    ? startDate.plusMonths((long) (n - 1) * intervalMonths)
                    : startDate;
            String periodLabel = buildPeriodLabel(frequency, n, dueDate);

            Payment p = paymentByPeriod.get(n);
            String status;
            Long paymentId = null;
            String paymentStatus = null;

            if (p != null) {
                paymentId = p.getId();
                paymentStatus = p.getStatus().name();
                if (p.getStatus() == PaymentStatus.VERIFIED) {
                    status = "PAID";
                    paidCount++;
                } else if (p.getStatus() == PaymentStatus.PENDING) {
                    status = "PENDING_VERIFICATION";
                } else {
                    // REJECTED — treat as still owing
                    status = dueDate.isBefore(today) ? "OVERDUE" : "DUE";
                }
            } else {
                if (dueDate.isBefore(today)) {
                    status = "OVERDUE";
                } else if (dueDate.getMonth() == today.getMonth() && dueDate.getYear() == today.getYear()) {
                    status = "DUE";
                } else {
                    status = "UPCOMING";
                }
            }

            schedule.add(new PremiumScheduleResponse.InstallmentEntry(
                    n, periodLabel, dueDate, installmentAmount, status, paymentId, paymentStatus));
        }

        PremiumScheduleResponse res = new PremiumScheduleResponse();
        res.setApplicationId(app.getId());
        res.setPolicyNumber(app.getPolicyNumber());
        res.setPackageName(pkg != null ? pkg.getName() : null);
        res.setPackageType(pkg != null ? pkg.getType() : null);
        res.setPaymentFrequency(frequency);
        res.setPaymentIntervalMonths(intervalMonths);
        res.setInstallmentAmount(installmentAmount);
        res.setTotalPremium(totalPremium);
        res.setTotalInstallments(totalInstallments);
        res.setPaidCount(paidCount);
        res.setSchedule(schedule);
        return res;
    }

    /**
     * Builds a single AdminScheduleEntryResponse for the current/due period of one application.
     */
    public static AdminScheduleEntryResponse buildAdminEntry(
            PolicyApplication app,
            List<Payment> payments) {

        PremiumScheduleResponse schedule = buildSchedule(app, payments);
        LocalDate today = LocalDate.now();

        // Find the most relevant period: first OVERDUE, then DUE, then earliest UPCOMING
        PremiumScheduleResponse.InstallmentEntry current = schedule.getSchedule().stream()
                .filter(e -> "OVERDUE".equals(e.getStatus()) || "DUE".equals(e.getStatus()))
                .findFirst()
                .orElse(schedule.getSchedule().stream()
                        .filter(e -> "UPCOMING".equals(e.getStatus()) || "PENDING_VERIFICATION".equals(e.getStatus()))
                        .findFirst()
                        .orElse(schedule.getSchedule().isEmpty() ? null : schedule.getSchedule().get(schedule.getSchedule().size() - 1)));

        if (current == null) return null;

        var user = app.getCustomer();
        var pkg = app.getInsurancePackage();

        AdminScheduleEntryResponse entry = new AdminScheduleEntryResponse();
        entry.setCustomerId(user != null ? user.getId() : null);
        entry.setCustomerName(user != null ? user.getName() : null);
        entry.setCustomerEmail(user != null ? user.getEmail() : null);
        entry.setApplicationId(app.getId());
        entry.setPolicyNumber(app.getPolicyNumber());
        entry.setPackageName(pkg != null ? pkg.getName() : null);
        entry.setPackageType(pkg != null ? pkg.getType() : null);
        entry.setPaymentFrequency(schedule.getPaymentFrequency());
        entry.setInstallmentAmount(schedule.getInstallmentAmount());
        entry.setCurrentPeriodNumber(current.getPeriodNumber());
        entry.setPeriodLabel(current.getPeriodLabel());
        entry.setDueDate(current.getDueDate());
        entry.setScheduleStatus(current.getStatus());
        entry.setPaymentId(current.getPaymentId());
        entry.setPaymentStatus(current.getPaymentStatus());
        entry.setTotalInstallments(schedule.getTotalInstallments());
        entry.setPaidInstallments(schedule.getPaidCount());
        return entry;
    }

    private static String buildPeriodLabel(String frequency, int n, LocalDate dueDate) {
        if (frequency == null) return "Period " + n;
        return switch (frequency.toUpperCase()) {
            case "MONTHLY" -> dueDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case "QUARTERLY" -> "Q" + ((n - 1) % 4 + 1) + " " + dueDate.getYear();
            case "HALF_YEARLY" -> (n % 2 == 1 ? "1st Half " : "2nd Half ") + dueDate.getYear();
            case "YEARLY" -> "Year " + n;
            default -> "Period " + n;
        };
    }
}
