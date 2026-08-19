package com.insurance.portal.controller;

import com.insurance.portal.model.AnalyticsResetRecord;
import com.insurance.portal.model.Claim;
import com.insurance.portal.model.Payment;
import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminReportsController {

    private final UserRepository userRepo;
    private final PolicyApplicationRepository appRepo;
    private final ClaimRepository claimRepo;
    private final PaymentRepository paymentRepo;
    private final InsurancePackageRepository packageRepo;
    private final AnalyticsResetRepository resetRepo;
    private final JdbcTemplate jdbcTemplate;

    // ── Reports ───────────────────────────────────────────────────────
    /**
     * Fast initial report payload. Uses SQL aggregation so the browser never waits
     * for thousands of full JPA entities (including TEXT/LONGTEXT columns).
     */
    @GetMapping("/reports/summary")
    @Transactional(readOnly = true)
    public Map<String, Object> getReportsSummary() {
        Map<String, Object> r = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime resetAfter = getLastResetTime();
        LocalDateTime twelveMonths = now.minusMonths(12);
        LocalDateTime chartStart = resetAfter.isAfter(twelveMonths) ? resetAfter : twelveMonths;

        r.put("totalCustomers", userRepo.countByRole(Role.CUSTOMER));
        r.put("totalAgents", userRepo.countByRole(Role.AGENT));
        r.put("totalApplications", sqlLong("SELECT COUNT(*) FROM policy_applications WHERE created_at >= ?", resetAfter));
        r.put("activePolicies", sqlLong("SELECT COUNT(*) FROM policy_applications WHERE created_at >= ? AND status='APPROVED'", resetAfter));
        r.put("pendingApplications", sqlLong("SELECT COUNT(*) FROM policy_applications WHERE created_at >= ? AND status IN ('PENDING','VERIFIED')", resetAfter));
        r.put("rejectedApplications", sqlLong("SELECT COUNT(*) FROM policy_applications WHERE created_at >= ? AND status='REJECTED'", resetAfter));
        r.put("totalClaims", sqlLong("SELECT COUNT(*) FROM claims WHERE created_at >= ?", resetAfter));
        r.put("approvedClaims", sqlLong("SELECT COUNT(*) FROM claims WHERE created_at >= ? AND status='APPROVED'", resetAfter));
        r.put("pendingClaims", sqlLong("SELECT COUNT(*) FROM claims WHERE created_at >= ? AND status IN ('PENDING','VERIFIED')", resetAfter));
        r.put("rejectedClaims", sqlLong("SELECT COUNT(*) FROM claims WHERE created_at >= ? AND status='REJECTED'", resetAfter));

        BigDecimal totalRevenue = sqlDecimal("SELECT COALESCE(SUM(amount),0) FROM payments WHERE created_at >= ? AND status='VERIFIED' AND amount IS NOT NULL AND (payment_type IS NULL OR payment_type <> 'CLAIM_PAYOUT')", resetAfter);
        BigDecimal totalClaimsPaid = sqlDecimal("SELECT COALESCE(SUM(amount),0) FROM claims WHERE created_at >= ? AND status='APPROVED' AND amount IS NOT NULL", resetAfter);
        BigDecimal netProfit = totalRevenue.subtract(totalClaimsPaid);
        double lossRatio = totalRevenue.signum() > 0 ? totalClaimsPaid.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;
        double profitMargin = totalRevenue.signum() > 0 ? netProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;
        r.put("totalRevenue", totalRevenue); r.put("totalClaimsPaid", totalClaimsPaid); r.put("netProfit", netProfit);
        r.put("lossRatioPct", lossRatio); r.put("profitMarginPct", profitMargin);

        Map<String, BigDecimal> revenueByType = sqlTypeDecimal("""
            SELECT ip.type, COALESCE(SUM(p.amount),0) total
            FROM payments p JOIN policy_applications a ON a.id=p.application_id
            JOIN insurance_packages ip ON ip.id=a.package_id
            WHERE p.created_at >= ? AND p.status='VERIFIED' AND p.amount IS NOT NULL
              AND (p.payment_type IS NULL OR p.payment_type <> 'CLAIM_PAYOUT')
            GROUP BY ip.type ORDER BY ip.type""", resetAfter);
        Map<String, BigDecimal> claimsByTypeTotals = sqlTypeDecimal("""
            SELECT COALESCE(ip.type,'OTHER'), COALESCE(SUM(c.amount),0) total
            FROM claims c LEFT JOIN policy_applications a ON a.id=c.application_id
            LEFT JOIN insurance_packages ip ON ip.id=a.package_id
            WHERE c.created_at >= ? AND c.status='APPROVED' AND c.amount IS NOT NULL
            GROUP BY COALESCE(ip.type,'OTHER') ORDER BY 1""", resetAfter);
        r.put("revenueByType", revenueByType); r.put("claimsTotalByType", claimsByTypeTotals);

        Map<String, Long> policiesByType = new TreeMap<>();
        jdbcTemplate.query("""
            SELECT ip.type, COUNT(*) total FROM policy_applications a
            JOIN insurance_packages ip ON ip.id=a.package_id
            WHERE a.created_at >= ? AND a.status='APPROVED' GROUP BY ip.type ORDER BY ip.type""",
            ps -> ps.setObject(1, resetAfter), (RowCallbackHandler) rs -> {
                policiesByType.put(rs.getString(1), rs.getLong(2));
            });
        r.put("policiesByType", policiesByType);

        Set<String> typeKeys = new TreeSet<>(); typeKeys.addAll(revenueByType.keySet()); typeKeys.addAll(claimsByTypeTotals.keySet());
        Map<String, Map<String,Object>> profitByType = new LinkedHashMap<>();
        for (String type : typeKeys) {
            BigDecimal in = revenueByType.getOrDefault(type, BigDecimal.ZERO), out = claimsByTypeTotals.getOrDefault(type, BigDecimal.ZERO);
            profitByType.put(type, new LinkedHashMap<>(Map.of("income", in, "outflow", out, "profit", in.subtract(out))));
        }
        r.put("profitByType", profitByType);

        Map<String, BigDecimal> monthlyRevenue = emptyMonthDecimalMap(now);
        jdbcTemplate.query("""
            SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(amount),0) total FROM payments
            WHERE created_at >= ? AND status='VERIFIED' AND amount IS NOT NULL
              AND (payment_type IS NULL OR payment_type <> 'CLAIM_PAYOUT') GROUP BY ym ORDER BY ym""",
            ps -> ps.setObject(1, chartStart), (RowCallbackHandler) rs -> {
                putMonth(monthlyRevenue, rs.getString(1), rs.getBigDecimal(2));
            });
        r.put("monthlyRevenue", monthlyRevenue);

        Map<String, BigDecimal> monthlyClaims = emptyMonthDecimalMap(now);
        jdbcTemplate.query("""
            SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COALESCE(SUM(amount),0) total FROM claims
            WHERE created_at >= ? AND status='APPROVED' AND amount IS NOT NULL GROUP BY ym ORDER BY ym""",
            ps -> ps.setObject(1, chartStart), (RowCallbackHandler) rs -> {
                putMonth(monthlyClaims, rs.getString(1), rs.getBigDecimal(2));
            });
        r.put("monthlyClaims", monthlyClaims);

        Map<String, Long> monthlyApps = emptyMonthLongMap(now);
        jdbcTemplate.query("SELECT DATE_FORMAT(created_at,'%Y-%m') ym, COUNT(*) total FROM policy_applications WHERE created_at >= ? GROUP BY ym ORDER BY ym",
            ps -> ps.setObject(1, chartStart), (RowCallbackHandler) rs -> {
                putMonth(monthlyApps, rs.getString(1), rs.getLong(2));
            });
        r.put("applicationsByMonth", monthlyApps);
        r.put("applicationsByMonth6", monthlyApps.entrySet().stream().skip(Math.max(0, monthlyApps.size()-6))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a,b)->b, LinkedHashMap::new)));

        Map<String, Map<String, BigDecimal>> claimsByType = new LinkedHashMap<>();
        jdbcTemplate.query("""
            SELECT COALESCE(ip.type,'OTHER') type, DATE_FORMAT(c.created_at,'%Y-%m') ym, COALESCE(SUM(c.amount),0) total
            FROM claims c LEFT JOIN policy_applications a ON a.id=c.application_id
            LEFT JOIN insurance_packages ip ON ip.id=a.package_id
            WHERE c.created_at >= ? AND c.status='APPROVED' AND c.amount IS NOT NULL
            GROUP BY COALESCE(ip.type,'OTHER'), ym ORDER BY type, ym""",
            ps -> ps.setObject(1, chartStart), (RowCallbackHandler) rs -> {
                claimsByType.computeIfAbsent(rs.getString(1), k -> new LinkedHashMap<>())
                    .put(displayMonth(rs.getString(2)), rs.getBigDecimal(3));
            });
        r.put("claimsByType", claimsByType);

        // Heavy detail sections are loaded only when the matching tab is opened.
        r.put("agentPerformance", List.of()); r.put("packagePopularity", List.of());
        r.put("claimsPayoutByCustomer", List.of());
        r.put("summaryOnly", true);
        return r;
    }

    @GetMapping("/reports")
    @Transactional(readOnly = true)
    public Map<String, Object> getReports() {
        Map<String, Object> r = new LinkedHashMap<>();
        LocalDateTime          now          = LocalDateTime.now();
        // Only count data created after the last analytics reset (if any)
        LocalDateTime          resetAfter   = getLastResetTime();
        List<PolicyApplication> allApps     = appRepo.findAll().stream()
                .filter(a -> a.getCreatedAt() == null || !a.getCreatedAt().isBefore(resetAfter))
                .toList();
        List<Claim>            allClaims    = claimRepo.findAll().stream()
                .filter(c -> c.getCreatedAt() == null || !c.getCreatedAt().isBefore(resetAfter))
                .toList();
        List<Payment>          allPayments  = paymentRepo.findAll().stream()
                .filter(p -> p.getCreatedAt() == null || !p.getCreatedAt().isBefore(resetAfter))
                .toList();

        // Basic counts
        r.put("totalCustomers",       userRepo.findAllByRole(Role.CUSTOMER).size());
        r.put("totalAgents",          userRepo.findAllByRole(Role.AGENT).size());
        r.put("totalApplications",    allApps.size());
        r.put("activePolicies",       allApps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED).count());
        r.put("pendingApplications",  allApps.stream().filter(a -> a.getStatus() == ApplicationStatus.PENDING || a.getStatus() == ApplicationStatus.VERIFIED).count());
        r.put("rejectedApplications", allApps.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count());
        r.put("totalClaims",          allClaims.size());
        r.put("approvedClaims",       allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.APPROVED).count());
        r.put("pendingClaims",        allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.PENDING || c.getStatus() == ClaimStatus.VERIFIED).count());
        r.put("rejectedClaims",       allClaims.stream().filter(c -> c.getStatus() == ClaimStatus.REJECTED).count());

        // Revenue — only count customer premium payments; exclude CLAIM_PAYOUT entries
        // (CLAIM_PAYOUT records are created internally when admin approves a claim and
        //  represent money going OUT to customers, not income coming IN from premiums)
        List<Payment> verifiedPayments = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.VERIFIED && p.getAmount() != null
                        && !"CLAIM_PAYOUT".equals(p.getPaymentType()))
                .toList();
        BigDecimal totalRevenue = sumAmounts(verifiedPayments.stream().map(Payment::getAmount).toList());
        BigDecimal totalClaimsPaid = sumAmounts(allClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null)
                .map(Claim::getAmount).toList());

        r.put("totalRevenue",    totalRevenue);
        r.put("totalClaimsPaid", totalClaimsPaid);

        BigDecimal netProfit = totalRevenue.subtract(totalClaimsPaid);
        double lossRatio = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalClaimsPaid.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;
        double profitMarginPct = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0.0;
        r.put("netProfit",       netProfit);
        r.put("lossRatioPct",    lossRatio);
        r.put("profitMarginPct", profitMarginPct);

        // Revenue by type
        Map<String, BigDecimal> revenueByType = new TreeMap<>();
        for (Payment p : verifiedPayments) {
            if (p.getApplication() != null && p.getApplication().getInsurancePackage() != null)
                revenueByType.merge(p.getApplication().getInsurancePackage().getType(), p.getAmount(), BigDecimal::add);
        }
        r.put("revenueByType", revenueByType);

        // Claims total by type
        Map<String, BigDecimal> claimsTotalByType = new TreeMap<>();
        for (Claim c : allClaims) {
            if (c.getStatus() != ClaimStatus.APPROVED || c.getAmount() == null) continue;
            String type = c.getApplication() != null && c.getApplication().getInsurancePackage() != null
                    ? c.getApplication().getInsurancePackage().getType() : "OTHER";
            claimsTotalByType.merge(type, c.getAmount(), BigDecimal::add);
        }
        r.put("claimsTotalByType", claimsTotalByType);

        // Profit/Loss by type
        Set<String> allTypeKeys = new TreeSet<>();
        allTypeKeys.addAll(revenueByType.keySet());
        allTypeKeys.addAll(claimsTotalByType.keySet());
        Map<String, Map<String, Object>> profitByType = new LinkedHashMap<>();
        for (String type : allTypeKeys) {
            BigDecimal income  = revenueByType.getOrDefault(type, BigDecimal.ZERO);
            BigDecimal outflow = claimsTotalByType.getOrDefault(type, BigDecimal.ZERO);
            Map<String, Object> tm = new LinkedHashMap<>();
            tm.put("income",  income);
            tm.put("outflow", outflow);
            tm.put("profit",  income.subtract(outflow));
            profitByType.put(type, tm);
        }
        r.put("profitByType", profitByType);

        // Active policies by type
        r.put("policiesByType", allApps.stream()
                .filter(a -> a.getStatus() == ApplicationStatus.APPROVED && a.getInsurancePackage() != null)
                .collect(Collectors.groupingBy(a -> a.getInsurancePackage().getType(), Collectors.counting())));

        // Monthly revenue — last 12 months
        r.put("monthlyRevenue",  buildMonthlyMap(now, verifiedPayments.stream()
                .map(p -> Map.entry(p.getCreatedAt(), p.getAmount())).toList(), now.minusMonths(12)));

        // Monthly claims paid — last 12 months
        r.put("monthlyClaims", buildMonthlyMap(now, allClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null)
                .map(c -> Map.entry(c.getCreatedAt(), c.getAmount())).toList(), now.minusMonths(12)));

        // Applications per month
        Map<String, Long> appsByMonth = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) appsByMonth.put(monthKey(now.minusMonths(i)), 0L);
        for (PolicyApplication a : allApps) {
            if (a.getCreatedAt() != null && a.getCreatedAt().isAfter(now.minusMonths(12)))
                appsByMonth.merge(monthKey(a.getCreatedAt()), 1L, Long::sum);
        }
        r.put("applicationsByMonth", appsByMonth);
        r.put("applicationsByMonth6", appsByMonth.entrySet().stream()
                .skip(Math.max(0, appsByMonth.size() - 6))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> b, LinkedHashMap::new)));

        // Agent performance
        List<User> agents = userRepo.findAllByRole(Role.AGENT);
        r.put("agentPerformance", agents.stream().map(agent -> {
            long appsHandled   = allApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId())).count();
            long claimsHandled = allClaims.stream().filter(c -> c.getAgent() != null && c.getAgent().getId().equals(agent.getId())).count();
            long appsApproved  = allApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId()) && a.getStatus() == ApplicationStatus.APPROVED).count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agentId",              agent.getId());
            m.put("agentName",            agent.getName());
            m.put("agentEmail",           agent.getEmail());
            m.put("insuranceType",        agent.getInsuranceType());
            m.put("applicationsHandled",  appsHandled);
            m.put("claimsHandled",        claimsHandled);
            m.put("applicationsApproved", appsApproved);
            m.put("claimsApproved",       allClaims.stream().filter(c -> c.getAgent() != null && c.getAgent().getId().equals(agent.getId()) && c.getStatus() == ClaimStatus.APPROVED).count());
            m.put("approvalRate",         appsHandled > 0 ? Math.round((double) appsApproved / appsHandled * 1000.0) / 10.0 : 0.0);
            return m;
        }).sorted((a, b) -> Long.compare((Long) b.get("applicationsHandled"), (Long) a.get("applicationsHandled")))
          .collect(Collectors.toList()));

        // Package popularity
        r.put("packagePopularity", packageRepo.findAll().stream().map(pkg -> {
            List<PolicyApplication> pkgApps = allApps.stream()
                    .filter(a -> a.getInsurancePackage() != null && a.getInsurancePackage().getId().equals(pkg.getId()))
                    .collect(Collectors.toList());
            BigDecimal revenue = verifiedPayments.stream()
                    .filter(p -> p.getApplication() != null && p.getApplication().getInsurancePackage() != null
                            && p.getApplication().getInsurancePackage().getId().equals(pkg.getId()))
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("packageId",        pkg.getId());
            m.put("packageName",      pkg.getName());
            m.put("packageType",      pkg.getType());
            m.put("applicationCount", pkgApps.size());
            m.put("approvedCount",    (int) pkgApps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED).count());
            m.put("revenue",          revenue);
            m.put("active",           pkg.isActive());
            return m;
        }).sorted((a, b) -> Integer.compare((Integer) b.get("applicationCount"), (Integer) a.get("applicationCount")))
          .collect(Collectors.toList()));

        // Claims payout by customer
        Map<Long, Map<String, Object>> payoutMap = new LinkedHashMap<>();
        for (Claim c : allClaims) {
            if (c.getStatus() != ClaimStatus.APPROVED || c.getCustomer() == null || c.getAmount() == null) continue;
            Long cid = c.getCustomer().getId();
            payoutMap.computeIfAbsent(cid, id -> {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("customerId",    c.getCustomer().getId());
                cm.put("customerName",  c.getCustomer().getName());
                cm.put("customerEmail", c.getCustomer().getEmail());
                cm.put("totalPayout",   BigDecimal.ZERO);
                cm.put("claimCount",    0);
                cm.put("claims",        new ArrayList<>());
                return cm;
            });
            Map<String, Object> cm = payoutMap.get(cid);
            cm.put("totalPayout", ((BigDecimal) cm.get("totalPayout")).add(c.getAmount()));
            cm.put("claimCount", (int) cm.get("claimCount") + 1);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("claimId",      c.getId());
            entry.put("amount",       c.getAmount());
            entry.put("claimType",    c.getClaimType());
            entry.put("insuranceType", c.getApplication() != null && c.getApplication().getInsurancePackage() != null
                    ? c.getApplication().getInsurancePackage().getType() : null);
            entry.put("approvedAt",   c.getUpdatedAt());
            ((List<Object>) cm.get("claims")).add(entry);
        }
        r.put("claimsPayoutByCustomer", payoutMap.values().stream()
                .sorted(Comparator.comparing(m -> ((BigDecimal) m.get("totalPayout")).negate()))
                .collect(Collectors.toList()));

        // Monthly claims payout by type
        Map<String, Map<String, BigDecimal>> claimsByType = new LinkedHashMap<>();
        for (Claim c : allClaims) {
            if (c.getStatus() != ClaimStatus.APPROVED || c.getCreatedAt() == null
                    || c.getAmount() == null || c.getCreatedAt().isBefore(now.minusMonths(12))) continue;
            String type  = c.getApplication() != null && c.getApplication().getInsurancePackage() != null
                    ? c.getApplication().getInsurancePackage().getType() : "OTHER";
            claimsByType.computeIfAbsent(type, k -> new LinkedHashMap<>())
                    .merge(monthKey(c.getCreatedAt()), c.getAmount(), BigDecimal::add);
        }
        r.put("claimsByType", claimsByType);

        return r;
    }

    // ── Wallet ────────────────────────────────────────────────────────
    @GetMapping("/wallet")
    @Transactional(readOnly = true)
    public Map<String, Object> getWallet() {
        Map<String, Object> w = new LinkedHashMap<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime resetAfter = getLastResetTime();
        List<Payment> allPayments = paymentRepo.findAll().stream()
                .filter(p -> p.getCreatedAt() == null || !p.getCreatedAt().isBefore(resetAfter))
                .toList();
        List<Claim>   allClaims  = claimRepo.findAll().stream()
                .filter(c -> c.getCreatedAt() == null || !c.getCreatedAt().isBefore(resetAfter))
                .toList();

        // Only count customer premium payments; exclude CLAIM_PAYOUT entries from inflow
        List<Payment> verifiedPayments = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.VERIFIED && p.getAmount() != null
                        && !"CLAIM_PAYOUT".equals(p.getPaymentType()))
                .toList();
        BigDecimal totalInflow  = sumAmounts(verifiedPayments.stream().map(Payment::getAmount).toList());
        BigDecimal totalOutflow = sumAmounts(allClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null)
                .map(Claim::getAmount).toList());

        w.put("totalInflow",     totalInflow);
        w.put("totalOutflow",    totalOutflow);
        w.put("totalClaimsPaid", totalOutflow);
        w.put("walletBalance",   totalInflow.subtract(totalOutflow));
        w.put("monthlyInflow",   buildMonthlyMap(now, verifiedPayments.stream().map(p -> Map.entry(p.getCreatedAt(), p.getAmount())).toList(), now.minusMonths(12)));
        w.put("monthlyOutflow",  buildMonthlyMap(now, allClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null)
                .map(c -> Map.entry(c.getCreatedAt(), c.getAmount())).toList(), now.minusMonths(12)));

        // Per-customer transaction list
        Map<Long, Map<String, Object>> custMap = new LinkedHashMap<>();
        for (Payment p : verifiedPayments) {
            if (p.getCustomer() == null) continue;
            Long cid = p.getCustomer().getId();
            custMap.computeIfAbsent(cid, id -> {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("customerId",    p.getCustomer().getId());
                cm.put("customerName",  p.getCustomer().getName());
                cm.put("customerEmail", p.getCustomer().getEmail());
                cm.put("totalPaid",     BigDecimal.ZERO);
                cm.put("paymentCount",  0);
                cm.put("transactions",  new ArrayList<>());
                return cm;
            });
            Map<String, Object> cm = custMap.get(cid);
            cm.put("totalPaid",    ((BigDecimal) cm.get("totalPaid")).add(p.getAmount()));
            cm.put("paymentCount", (int) cm.get("paymentCount") + 1);
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("id",          p.getId());
            tx.put("amount",      p.getAmount());
            tx.put("method",      p.getPaymentMethod());
            tx.put("periodLabel", p.getPeriodLabel());
            tx.put("policyName",  p.getApplication() != null && p.getApplication().getInsurancePackage() != null
                    ? p.getApplication().getInsurancePackage().getName() : null);
            tx.put("insuranceType", p.getApplication() != null && p.getApplication().getInsurancePackage() != null
                    ? p.getApplication().getInsurancePackage().getType() : null);
            tx.put("createdAt",   p.getCreatedAt());
            ((List<Object>) cm.get("transactions")).add(tx);
        }
        w.put("customers", custMap.values().stream()
                .sorted(Comparator.comparing(cm -> ((BigDecimal) cm.get("totalPaid")).negate()))
                .toList());
        return w;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /** Returns the timestamp of the last analytics reset, or LocalDateTime.MIN if no reset has occurred. */
    private LocalDateTime getLastResetTime() {
        return resetRepo.findTopByOrderByResetAtDesc()
                .map(AnalyticsResetRecord::getResetAt)
                .orElse(LocalDateTime.of(1000, 1, 1, 0, 0));
    }


    private long sqlLong(String sql, LocalDateTime start) {
        Long v = jdbcTemplate.queryForObject(sql, Long.class, start); return v == null ? 0L : v;
    }
    private BigDecimal sqlDecimal(String sql, LocalDateTime start) {
        BigDecimal v = jdbcTemplate.queryForObject(sql, BigDecimal.class, start); return v == null ? BigDecimal.ZERO : v;
    }
    private Map<String, BigDecimal> sqlTypeDecimal(String sql, LocalDateTime start) {
        Map<String, BigDecimal> out = new TreeMap<>();
        jdbcTemplate.query(sql, ps -> ps.setObject(1, start), (RowCallbackHandler) rs -> {
            out.put(rs.getString(1), rs.getBigDecimal(2));
        });
        return out;
    }
    private static String displayMonth(String ym) {
        java.time.YearMonth m = java.time.YearMonth.parse(ym);
        return m.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + m.getYear();
    }
    private static Map<String, BigDecimal> emptyMonthDecimalMap(LocalDateTime now) {
        Map<String, BigDecimal> m = new LinkedHashMap<>();
        for (int i=11;i>=0;i--) m.put(monthKey(now.minusMonths(i)), BigDecimal.ZERO); return m;
    }
    private static Map<String, Long> emptyMonthLongMap(LocalDateTime now) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (int i=11;i>=0;i--) m.put(monthKey(now.minusMonths(i)), 0L); return m;
    }
    private static <T> void putMonth(Map<String,T> map, String ym, T value) {
        if (ym == null) return; String key = displayMonth(ym); if (map.containsKey(key)) map.put(key, value);
    }

    private static BigDecimal sumAmounts(List<BigDecimal> amounts) {
        return amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static String monthKey(LocalDateTime dt) {
        return dt.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + dt.getYear();
    }

    private static Map<String, BigDecimal> buildEmptyMonthMap(LocalDateTime now, int months) {
        Map<String, BigDecimal> map = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--)
            map.put(monthKey(now.minusMonths(i)), BigDecimal.ZERO);
        return map;
    }

    private static Map<String, Long> buildEmptyMonthMap(LocalDateTime now, int months, boolean ignored) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--)
            map.put(monthKey(now.minusMonths(i)), 0L);
        return map;
    }

    private static Map<String, BigDecimal> buildMonthlyMap(LocalDateTime now,
            List<Map.Entry<LocalDateTime, BigDecimal>> entries, LocalDateTime cutoff) {
        Map<String, BigDecimal> map = buildEmptyMonthMap(now, 12);
        for (Map.Entry<LocalDateTime, BigDecimal> e : entries) {
            if (e.getKey() != null && e.getValue() != null && e.getKey().isAfter(cutoff))
                map.merge(monthKey(e.getKey()), e.getValue(), BigDecimal::add);
        }
        return map;
    }
}
