package com.insurance.portal.controller;

import com.insurance.portal.model.*;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import java.time.format.DateTimeFormatter;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.insurance.portal.util.PdfFontUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class MonthlyReportController {

    private final PaymentRepository paymentRepo;
    private final ClaimRepository claimRepo;
    private final PolicyApplicationRepository appRepo;
    private final UserRepository userRepo;
    private final InsurancePackageRepository packageRepo;
    private final MonthlyReportSnapshotRepository snapshotRepo;
    private final AnalyticsResetRepository resetRepo;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    // ─── Colours shared across builders ──────────────────────────────────────
    private static final DeviceRgb NAVY  = new DeviceRgb(15, 23, 42);
    private static final DeviceRgb BLUE  = new DeviceRgb(29, 78, 175);
    private static final DeviceRgb GREEN = new DeviceRgb(22, 163, 74);
    private static final DeviceRgb RED   = new DeviceRgb(220, 38, 38);
    private static final DeviceRgb AMBER = new DeviceRgb(217, 119, 6);
    private static final DeviceRgb GRAY  = new DeviceRgb(71, 85, 105);
    private static final DeviceRgb LIGHT = new DeviceRgb(241, 245, 249);

    // ─────────────────────────────────────────────────────────────────────────
    // GET /admin/reports/monthly-pdf?year=2026&month=7
    // Streams a generated PDF for any given month (defaults to current month).
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/monthly-pdf")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, String>> downloadMonthlyPdf(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) throws Exception {

        LocalDateTime now = LocalDateTime.now();
        int y = (year != null && year > 0) ? year : now.getYear();
        int m = (month != null && month >= 1 && month <= 12) ? month : now.getMonthValue();

        byte[] pdf = buildMonthlyReportPdf(y, m);
        String filename = String.format("monthly-report-%d-%02d.pdf", y, m);

        return pdfJson(pdf, filename);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /admin/reports/monthly-reset
    // Exports ALL data since the last reset as a comprehensive PDF (covering
    // overview, by type, wallet, agents, plan popularity, and monthly analytics),
    // archives the report, records the new reset baseline, and returns the PDF.
    // After this call the analytics dashboards start from zero (only data
    // created after this moment will be counted).
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/monthly-reset")
    @Transactional
    public ResponseEntity<Map<String, String>> monthlyReset() throws Exception {

        LocalDateTime now = LocalDateTime.now();

        // ── Determine the period start (the previous reset, or null = all-time) ──
        AnalyticsResetRecord lastReset = resetRepo.findTopByOrderByResetAtDesc().orElse(null);
        LocalDateTime periodStart      = (lastReset != null) ? lastReset.getResetAt() : null;

        // ── Build comprehensive period PDF ────────────────────────────────
        byte[] pdf = buildFullPeriodReportPdf(periodStart, now);

        // ── Compute summary stats for snapshot ────────────────────────────
        LocalDateTime effectiveFrom = (periodStart != null) ? periodStart
                : LocalDateTime.of(2000, 1, 1, 0, 0, 0);

        List<Payment>           allPayments = paymentRepo.findAll();
        List<Claim>             allClaims   = claimRepo.findAll();
        List<PolicyApplication> allApps     = appRepo.findAll();

        BigDecimal revenue = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.VERIFIED
                        && p.getAmount() != null
                        && !"CLAIM_PAYOUT".equals(p.getPaymentType())
                        && inPeriod(p.getCreatedAt(), effectiveFrom, now))
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal claimsPaid = allClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED
                        && c.getAmount() != null
                        && inPeriod(c.getCreatedAt(), effectiveFrom, now))
                .map(Claim::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalApps    = (int) allApps.stream().filter(a -> inPeriod(a.getCreatedAt(), effectiveFrom, now)).count();
        int newPolicies  = (int) allApps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED
                && inPeriod(a.getCreatedAt(), effectiveFrom, now)).count();
        int totalClaimsM = (int) allClaims.stream().filter(c -> inPeriod(c.getCreatedAt(), effectiveFrom, now)).count();
        int totalCust    = userRepo.findAllByRole(Role.CUSTOMER).size();
        int y = now.getYear();
        int m = now.getMonthValue();

        // ── Save PDF to disk ──────────────────────────────────────────────
        String pdfFilename = String.format("period-report-%d%02d-%d.pdf", y, m, System.currentTimeMillis());
        Path dir = Paths.get(uploadDir, "monthly-reports");
        Files.createDirectories(dir);
        Path filePath = dir.resolve(pdfFilename);
        Files.write(filePath, pdf);

        // ── Persist snapshot record ───────────────────────────────────────
        LocalDateTime snapStart = (periodStart != null) ? periodStart
                : LocalDateTime.of(2000, 1, 1, 0, 0, 0);
        MonthlyReportSnapshot snapshot = MonthlyReportSnapshot.builder()
                .year(y).month(m)
                .periodStart(snapStart)
                .periodEnd(now)
                .totalRevenue(revenue)
                .totalClaimsPaid(claimsPaid)
                .netProfit(revenue.subtract(claimsPaid))
                .totalApplications(totalApps)
                .newPolicies(newPolicies)
                .totalClaims(totalClaimsM)
                .totalCustomers(totalCust)
                .pdfPath(filePath.toAbsolutePath().toString())
                .build();
        snapshotRepo.save(snapshot);

        // ── Record the analytics reset event ─────────────────────────────
        resetRepo.save(AnalyticsResetRecord.builder()
                .resetAt(now)
                .periodStart(periodStart)
                .pdfPath(filePath.toAbsolutePath().toString())
                .build());

        String attachment = String.format("period-report-%d-%02d.pdf", y, m);
        return pdfJson(pdf, attachment);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /admin/reports/last-reset
    // Returns the timestamp of the most recent reset and the period start date.
    // The frontend uses this to display "Current period: X → today".
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/last-reset")
    public ResponseEntity<Map<String, Object>> getLastReset() {
        return resetRepo.findTopByOrderByResetAtDesc().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("resetAt",     r.getResetAt());
            m.put("periodStart", r.getPeriodStart());
            return ResponseEntity.ok(m);
        }).orElse(ResponseEntity.ok(null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /admin/reports/monthly-snapshots
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/monthly-snapshots")
    public List<Map<String, Object>> listSnapshots() {
        return snapshotRepo.findAllByOrderByCreatedAtDesc().stream().map(s -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id",                s.getId());
            map.put("year",              s.getYear());
            map.put("month",             s.getMonth());
            map.put("monthName",         Month.of(s.getMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH));
            map.put("periodStart",       s.getPeriodStart());
            map.put("periodEnd",         s.getPeriodEnd());
            map.put("totalRevenue",      s.getTotalRevenue());
            map.put("totalClaimsPaid",   s.getTotalClaimsPaid());
            map.put("netProfit",         s.getNetProfit());
            map.put("totalApplications", s.getTotalApplications());
            map.put("newPolicies",       s.getNewPolicies());
            map.put("totalClaims",       s.getTotalClaims());
            map.put("totalCustomers",    s.getTotalCustomers());
            map.put("createdAt",         s.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /admin/reports/monthly-snapshots/{id}/pdf
    // Re-download a previously archived monthly PDF.
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/monthly-snapshots/{id}/pdf")
    public ResponseEntity<Map<String, String>> downloadSnapshotPdf(@PathVariable Long id) throws Exception {
        MonthlyReportSnapshot snapshot = snapshotRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Snapshot not found: " + id));

        if (snapshot.getPdfPath() == null) {
            return ResponseEntity.notFound().build();
        }
        Path file = Paths.get(snapshot.getPdfPath());
        if (!Files.exists(file)) {
            // File was deleted — regenerate on the fly
            byte[] pdf = buildMonthlyReportPdf(snapshot.getYear(), snapshot.getMonth());
            String filename = String.format("monthly-report-%d-%02d.pdf", snapshot.getYear(), snapshot.getMonth());
            return pdfJson(pdf, filename);
        }
        byte[] pdf = Files.readAllBytes(file);
        String filename = String.format("monthly-report-%d-%02d.pdf", snapshot.getYear(), snapshot.getMonth());
        return pdfJson(pdf, filename);
    }

    private ResponseEntity<Map<String, String>> pdfJson(byte[] pdf, String filename) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("filename", filename);
        body.put("contentType", MediaType.APPLICATION_PDF_VALUE);
        body.put("base64", Base64.getEncoder().encodeToString(pdf));
        return ResponseEntity.ok()
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PDF Builder
    // ─────────────────────────────────────────────────────────────────────────
    private byte[] buildMonthlyReportPdf(int year, int month) throws Exception {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime periodStart = LocalDateTime.of(year, month, 1, 0, 0, 0);
        LocalDateTime periodEnd   = periodStart.plusMonths(1).minusNanos(1);
        String monthName          = Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        String periodLabel        = monthName + " " + year;
        String generatedAt        = now.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm"));

        // ── Data queries ──────────────────────────────────────────────────
        List<Payment>           allPayments = paymentRepo.findAll();
        List<Claim>             allClaims   = claimRepo.findAll();
        List<PolicyApplication> allApps     = appRepo.findAll();
        List<User>              agents      = userRepo.findAllByRole(Role.AGENT);
        List<InsurancePackage>  packages    = packageRepo.findAll();

        List<Payment> monthPayments = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.VERIFIED
                        && p.getAmount() != null
                        && !"CLAIM_PAYOUT".equals(p.getPaymentType())
                        && inMonth(p.getCreatedAt(), year, month))
                .toList();

        List<Claim> monthClaims         = allClaims.stream().filter(c -> inMonth(c.getCreatedAt(), year, month)).toList();
        List<Claim> approvedMonthClaims = monthClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null).toList();

        List<PolicyApplication> monthApps = allApps.stream()
                .filter(a -> inMonth(a.getCreatedAt(), year, month)).toList();

        BigDecimal totalRevenue   = monthPayments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalClaimsPaid = approvedMonthClaims.stream().map(Claim::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netProfit      = totalRevenue.subtract(totalClaimsPaid);
        double lossRatio  = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalClaimsPaid.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0;
        double profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0;

        long approvedApps = monthApps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED).count();
        long pendingApps  = monthApps.stream().filter(a -> a.getStatus() == ApplicationStatus.PENDING || a.getStatus() == ApplicationStatus.VERIFIED).count();
        long rejectedApps = monthApps.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count();

        long approvedClaimsCount = monthClaims.stream().filter(c -> c.getStatus() == ClaimStatus.APPROVED).count();
        long pendingClaims       = monthClaims.stream().filter(c -> c.getStatus() == ClaimStatus.PENDING || c.getStatus() == ClaimStatus.VERIFIED).count();
        long rejectedClaims      = monthClaims.stream().filter(c -> c.getStatus() == ClaimStatus.REJECTED).count();

        // ── Revenue by type ───────────────────────────────────────────────
        Map<String, BigDecimal> revenueByType = new TreeMap<>();
        for (Payment p : monthPayments) {
            if (p.getApplication() != null && p.getApplication().getInsurancePackage() != null)
                revenueByType.merge(p.getApplication().getInsurancePackage().getType(), p.getAmount(), BigDecimal::add);
        }
        Map<String, BigDecimal> claimsByType = new TreeMap<>();
        for (Claim c : approvedMonthClaims) {
            String type = (c.getApplication() != null && c.getApplication().getInsurancePackage() != null)
                    ? c.getApplication().getInsurancePackage().getType() : "OTHER";
            claimsByType.merge(type, c.getAmount(), BigDecimal::add);
        }

        // ── Agent performance this month ──────────────────────────────────
        List<Map<String, Object>> agentStats = agents.stream().map(agent -> {
            long handled  = monthApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId())).count();
            long approved = monthApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId()) && a.getStatus() == ApplicationStatus.APPROVED).count();
            long claims   = monthClaims.stream().filter(c -> c.getAgent() != null && c.getAgent().getId().equals(agent.getId())).count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",     agent.getName());
            m.put("type",     agent.getInsuranceType() != null ? agent.getInsuranceType() : "ALL");
            m.put("handled",  handled);
            m.put("approved", approved);
            m.put("claims",   claims);
            m.put("rate",     handled > 0 ? Math.round((double) approved / handled * 1000.0) / 10.0 : 0.0);
            return m;
        }).filter(m -> (long) m.get("handled") > 0 || (long) m.get("claims") > 0)
          .sorted((a, b) -> Long.compare((long) b.get("handled"), (long) a.get("handled")))
          .toList();

        // ── Package popularity this month ─────────────────────────────────
        List<Map<String, Object>> pkgStats = packages.stream().map(pkg -> {
            long count = monthApps.stream()
                    .filter(a -> a.getInsurancePackage() != null && a.getInsurancePackage().getId().equals(pkg.getId()))
                    .count();
            BigDecimal rev = monthPayments.stream()
                    .filter(p -> p.getApplication() != null && p.getApplication().getInsurancePackage() != null
                            && p.getApplication().getInsurancePackage().getId().equals(pkg.getId()))
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",  pkg.getName());
            m.put("type",  pkg.getType());
            m.put("count", count);
            m.put("rev",   rev);
            return m;
        }).filter(m -> (long) m.get("count") > 0)
          .sorted((a, b) -> Long.compare((long) b.get("count"), (long) a.get("count")))
          .toList();

        // ── Build PDF ─────────────────────────────────────────────────────
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdfDoc);
        doc.setMargins(36, 40, 36, 40);

        PdfFont regular = PdfFontUtil.bilingualFont();
        PdfFont bold    = regular;
        PdfFont oblique = regular;

        // ── HEADER ────────────────────────────────────────────────────────
        Table header = new Table(UnitValue.createPercentArray(new float[]{65, 35})).useAllAvailableWidth();
        header.addCell(new Cell()
                .add(PdfFontUtil.paragraph("DIGITAL INSURANCE CLAIMS AND PREMIUMS").setFont(bold).setFontSize(12).setFontColor(BLUE).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("PORTAL — MYANMAR").setFont(bold).setFontSize(9).setFontColor(NAVY).setMarginBottom(3))
                .add(PdfFontUtil.paragraph("ဒစ်ဂျစ်တယ် အာမခံ တောင်းဆိုမှုနှင့် ငွေကြေး ပေါ်တယ် — မြန်မာ").setFont(oblique).setFontSize(7.5f).setFontColor(GRAY))
                .setBorder(Border.NO_BORDER).setPadding(4));
        header.addCell(new Cell()
                .add(PdfFontUtil.paragraph("MONTHLY ANALYTICS REPORT").setFont(bold).setFontSize(10).setFontColor(BLUE).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(3))
                .add(PdfFontUtil.paragraph("လစဉ် ခွဲခြမ်းစိတ်ဖြာမှု အစီရင်ခံစာ").setFont(oblique).setFontSize(7.5f).setFontColor(GRAY).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(5))
                .add(PdfFontUtil.paragraph("Period: " + periodLabel).setFont(bold).setFontSize(8.5f).setFontColor(NAVY).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("Generated: " + generatedAt).setFont(regular).setFontSize(8).setFontColor(GRAY).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER).setPadding(4));
        doc.add(header);

        // Blue title bar
        Table bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        bar.addCell(new Cell()
                .add(PdfFontUtil.paragraph("MONTHLY REPORT: " + periodLabel.toUpperCase() + "   |   မြန်မာ")
                        .setFont(bold).setFontSize(10).setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(BLUE).setPadding(6).setBorder(Border.NO_BORDER));
        doc.add(bar);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(6));

        // ── SECTION 1: EXECUTIVE SUMMARY ─────────────────────────────────
        sectionHeader(doc, bold, "SECTION 1: EXECUTIVE FINANCIAL SUMMARY   (ဘဏ္ဍာရေး အကျဉ်းချုပ်)");

        Table summary = new Table(UnitValue.createPercentArray(new float[]{34, 33, 33})).useAllAvailableWidth();
        addSummaryCell(summary, bold, regular, "PREMIUM INCOME (ဝင်ငွေ)", fmt(totalRevenue) + " MMK", GREEN);
        addSummaryCell(summary, bold, regular, "CLAIM PAYOUT (ထွက်ငွေ)", fmt(totalClaimsPaid) + " MMK", RED);
        DeviceRgb profitColor = netProfit.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED;
        addSummaryCell(summary, bold, regular, "NET PROFIT (အမြတ်/အဆုံး)", (netProfit.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(netProfit) + " MMK", profitColor);
        doc.add(summary);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(4));

        // KPI row
        Table kpi = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        DeviceRgb lrColor = lossRatio < 60 ? GREEN : lossRatio < 80 ? AMBER : RED;
        DeviceRgb pmColor = profitMargin >= 20 ? GREEN : profitMargin >= 0 ? AMBER : RED;
        addKpiCell(kpi, bold, regular, "Loss Ratio (ဆုံးရှုံးမှု အချိုး)", String.format("%.1f%%", lossRatio),
                lossRatio < 60 ? "Good (ကောင်း)" : lossRatio < 80 ? "Caution (သတိပြုရန်)" : "High Risk (အန္တရာယ်မြင့်)", lrColor);
        addKpiCell(kpi, bold, regular, "Profit Margin (အမြတ် ရာခိုင်နှုန်း)", String.format("%.1f%%", profitMargin),
                profitMargin >= 20 ? "Good (ကောင်း)" : profitMargin >= 0 ? "Low (နည်း)" : "Loss (အရှုံး)", pmColor);
        doc.add(kpi);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));

        // ── SECTION 2: APPLICATION & CLAIM STATISTICS ─────────────────────
        sectionHeader(doc, bold, "SECTION 2: APPLICATION & CLAIM STATISTICS   (လျှောက်လွှာနှင့် Claim စာရင်း)");

        Table statsTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();

        // Applications sub-table
        Table appsInner = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        tableHeaderRow(appsInner, bold, NAVY, new String[]{"Applications (လျှောက်လွှာ)", "Count (အရေအတွက်)"});
        tableRow(appsInner, regular, "Total Applications (စုစုပေါင်း)", String.valueOf(monthApps.size()));
        tableRow(appsInner, regular, "Approved (အတည်ပြုပြီး)",  String.valueOf(approvedApps));
        tableRow(appsInner, regular, "Pending (စောင့်ဆိုင်းဆဲ)",   String.valueOf(pendingApps));
        tableRow(appsInner, regular, "Rejected (ငြင်းပယ်ပြီး)",  String.valueOf(rejectedApps));

        // Claims sub-table
        Table claimsInner = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        tableHeaderRow(claimsInner, bold, NAVY, new String[]{"Claims (တောင်းဆိုမှု)", "Count (အရေအတွက်)"});
        tableRow(claimsInner, regular, "Total Claims (စုစုပေါင်း)",    String.valueOf(monthClaims.size()));
        tableRow(claimsInner, regular, "Approved (အတည်ပြုပြီး)",   String.valueOf(approvedClaimsCount));
        tableRow(claimsInner, regular, "Pending (စောင့်ဆိုင်းဆဲ)",    String.valueOf(pendingClaims));
        tableRow(claimsInner, regular, "Rejected (ငြင်းပယ်ပြီး)",   String.valueOf(rejectedClaims));

        statsTable.addCell(new Cell().add(appsInner).setBorder(Border.NO_BORDER).setPaddingRight(6));
        statsTable.addCell(new Cell().add(claimsInner).setBorder(Border.NO_BORDER).setPaddingLeft(6));
        doc.add(statsTable);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));

        // ── SECTION 3: REVENUE & CLAIMS BY INSURANCE TYPE ────────────────
        if (!revenueByType.isEmpty() || !claimsByType.isEmpty()) {
            sectionHeader(doc, bold, "SECTION 3: FINANCIAL BREAKDOWN BY INSURANCE TYPE   (အာမခံ အမျိုးအစားအလိုက်)");

            Table typeTable = new Table(UnitValue.createPercentArray(new float[]{28, 24, 24, 24})).useAllAvailableWidth();
            tableHeaderRow(typeTable, bold, NAVY, new String[]{"Insurance Type (အာမခံအမျိုးအစား)", "Premium Income (ပရီမီယံဝင်ငွေ)", "Claim Payout (လျော်ကြေးပေးငွေ)", "Net Profit (အသားတင်အမြတ်)"});

            Set<String> allTypes = new TreeSet<>();
            allTypes.addAll(revenueByType.keySet());
            allTypes.addAll(claimsByType.keySet());
            BigDecimal grandRev = BigDecimal.ZERO, grandClaim = BigDecimal.ZERO;
            for (String type : allTypes) {
                BigDecimal rev   = revenueByType.getOrDefault(type, BigDecimal.ZERO);
                BigDecimal claim = claimsByType.getOrDefault(type, BigDecimal.ZERO);
                BigDecimal profit = rev.subtract(claim);
                grandRev   = grandRev.add(rev);
                grandClaim = grandClaim.add(claim);
                typeTable.addCell(cellOf(type, bold, 8.5f));
                typeTable.addCell(cellOf(fmt(rev), regular, 8.5f).setFontColor(GREEN));
                typeTable.addCell(cellOf(claim.compareTo(BigDecimal.ZERO) > 0 ? fmt(claim) : "—", regular, 8.5f).setFontColor(claim.compareTo(BigDecimal.ZERO) > 0 ? RED : GRAY));
                typeTable.addCell(cellOf((profit.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(profit), bold, 8.5f).setFontColor(profit.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED));
            }
            // Totals row
            BigDecimal grandProfit = grandRev.subtract(grandClaim);
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph("TOTAL (စုစုပေါင်း)").setFont(bold).setFontSize(8.5f)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(grandRev)).setFont(bold).setFontSize(8.5f).setFontColor(GREEN)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(grandClaim)).setFont(bold).setFontSize(8.5f).setFontColor(RED)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph((grandProfit.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(grandProfit)).setFont(bold).setFontSize(8.5f).setFontColor(grandProfit.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED)).setBackgroundColor(LIGHT).setPadding(4));
            doc.add(typeTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // ── SECTION 4: AGENT PERFORMANCE ─────────────────────────────────
        sectionHeader(doc, bold, "SECTION 4: AGENT PERFORMANCE THIS MONTH   (ဤလအတွင်း Agent လုပ်ဆောင်မှု)");

        if (agentStats.isEmpty()) {
            doc.add(PdfFontUtil.paragraph("No agent activity recorded for this period. (ဤကာလအတွက် Agent လုပ်ဆောင်မှု မရှိပါ။)")
                    .setFont(oblique).setFontSize(9).setFontColor(GRAY).setMarginBottom(8));
        } else {
            Table agentTable = new Table(UnitValue.createPercentArray(new float[]{30, 18, 14, 14, 14, 10})).useAllAvailableWidth();
            tableHeaderRow(agentTable, bold, NAVY, new String[]{"Agent (ကိုယ်စားလှယ်)", "Type (အမျိုးအစား)", "Applications (လျှောက်လွှာ)", "Approved (အတည်ပြု)", "Claims (တောင်းဆိုမှု)", "Rate (နှုန်း)"});
            for (Map<String, Object> a : agentStats) {
                double rate = (double) a.get("rate");
                DeviceRgb rc = rate >= 70 ? GREEN : rate >= 40 ? AMBER : RED;
                agentTable.addCell(cellOf((String) a.get("name"), bold, 8.5f));
                agentTable.addCell(cellOf((String) a.get("type"), regular, 8.5f));
                agentTable.addCell(cellOf(String.valueOf(a.get("handled")), regular, 8.5f));
                agentTable.addCell(cellOf(String.valueOf(a.get("approved")), regular, 8.5f).setFontColor(GREEN));
                agentTable.addCell(cellOf(String.valueOf(a.get("claims")), regular, 8.5f).setFontColor(AMBER));
                agentTable.addCell(new Cell().add(PdfFontUtil.paragraph(String.format("%.1f%%", rate)).setFont(bold).setFontSize(8.5f).setFontColor(rc)).setPadding(4));
            }
            doc.add(agentTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // ── SECTION 5: PACKAGE POPULARITY ────────────────────────────────
        sectionHeader(doc, bold, "SECTION 5: PACKAGE POPULARITY THIS MONTH   (ဤလအတွင်း Plan ရေပန်းစားမှု)");

        if (pkgStats.isEmpty()) {
            doc.add(PdfFontUtil.paragraph("No package applications recorded for this period. (ဤကာလအတွက် Plan လျှောက်လွှာ မရှိပါ။)")
                    .setFont(oblique).setFontSize(9).setFontColor(GRAY).setMarginBottom(8));
        } else {
            Table pkgTable = new Table(UnitValue.createPercentArray(new float[]{40, 22, 18, 20})).useAllAvailableWidth();
            tableHeaderRow(pkgTable, bold, NAVY, new String[]{"Package Name (Plan အမည်)", "Type (အမျိုးအစား)", "Applications (လျှောက်လွှာ)", "Revenue (ဝင်ငွေ)"});
            for (Map<String, Object> p : pkgStats) {
                pkgTable.addCell(cellOf((String) p.get("name"), bold, 8.5f));
                pkgTable.addCell(cellOf((String) p.get("type"), regular, 8.5f));
                pkgTable.addCell(cellOf(String.valueOf(p.get("count")), regular, 8.5f));
                pkgTable.addCell(cellOf(fmt((BigDecimal) p.get("rev")), regular, 8.5f).setFontColor(GREEN));
            }
            doc.add(pkgTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // ── FOOTER ────────────────────────────────────────────────────────
        Table footer = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        footer.addCell(new Cell()
                .add(PdfFontUtil.paragraph("This report is auto-generated by the Digital Insurance Claims and Premiums Portal — Myanmar. " +
                        "ဤ အစီရင်ခံစာကို ဒစ်ဂျစ်တယ် အာမခံ ပေါ်တယ်မှ အလိုအလျောက် ထုတ်ပေးပါသည်။\n" +
                        "Generated on: " + generatedAt + "   |   Period: " + periodLabel)
                        .setFont(oblique).setFontSize(7.5f).setFontColor(GRAY).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(LIGHT).setPadding(8).setBorder(new SolidBorder(LIGHT, 1)));
        doc.add(footer);

        doc.close();
        return baos.toByteArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Comprehensive Period PDF Builder
    // Covers every section shown in the dashboard: overview, by type, wallet,
    // agents, plan popularity, and monthly application analytics.
    // ─────────────────────────────────────────────────────────────────────────
    private byte[] buildFullPeriodReportPdf(LocalDateTime from, LocalDateTime to) throws Exception {
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd MMM yyyy");
        DateTimeFormatter dtFmt   = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

        String fromLabel   = (from == null) ? "Inception" : from.format(dateFmt);
        String toLabel     = to.format(dateFmt);
        String periodLabel = fromLabel + " \u2013 " + toLabel;
        String generatedAt = to.format(dtFmt);

        LocalDateTime effectiveFrom = (from != null) ? from : LocalDateTime.of(2000, 1, 1, 0, 0, 0);

        // ── Data ──────────────────────────────────────────────────────────
        List<Payment>           allPayments = paymentRepo.findAll();
        List<Claim>             allClaims   = claimRepo.findAll();
        List<PolicyApplication> allApps     = appRepo.findAll();
        List<User>              agents      = userRepo.findAllByRole(Role.AGENT);
        List<InsurancePackage>  packages    = packageRepo.findAll();

        List<Payment> periodPayments = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.VERIFIED
                        && p.getAmount() != null
                        && !"CLAIM_PAYOUT".equals(p.getPaymentType())
                        && inPeriod(p.getCreatedAt(), effectiveFrom, to))
                .toList();

        List<Claim> periodClaims = allClaims.stream()
                .filter(c -> inPeriod(c.getCreatedAt(), effectiveFrom, to)).toList();
        List<Claim> approvedClaims = periodClaims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED && c.getAmount() != null).toList();

        List<PolicyApplication> periodApps = allApps.stream()
                .filter(a -> inPeriod(a.getCreatedAt(), effectiveFrom, to)).toList();

        // ── Aggregate ────────────────────────────────────────────────────
        BigDecimal totalRevenue    = periodPayments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalClaimsPaid = approvedClaims.stream().map(Claim::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netProfit       = totalRevenue.subtract(totalClaimsPaid);
        double lossRatio    = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalClaimsPaid.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0;
        double profitMargin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP).doubleValue() : 0;

        long approvedApps  = periodApps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED).count();
        long pendingApps   = periodApps.stream().filter(a -> a.getStatus() == ApplicationStatus.PENDING || a.getStatus() == ApplicationStatus.VERIFIED).count();
        long rejectedApps  = periodApps.stream().filter(a -> a.getStatus() == ApplicationStatus.REJECTED).count();
        long approvedClaimsCount = periodClaims.stream().filter(c -> c.getStatus() == ClaimStatus.APPROVED).count();
        long pendingClaims  = periodClaims.stream().filter(c -> c.getStatus() == ClaimStatus.PENDING || c.getStatus() == ClaimStatus.VERIFIED).count();
        long rejectedClaims = periodClaims.stream().filter(c -> c.getStatus() == ClaimStatus.REJECTED).count();

        // Revenue / claims by type
        Map<String, BigDecimal> revenueByType = new TreeMap<>();
        for (Payment p : periodPayments) {
            if (p.getApplication() != null && p.getApplication().getInsurancePackage() != null)
                revenueByType.merge(p.getApplication().getInsurancePackage().getType(), p.getAmount(), BigDecimal::add);
        }
        Map<String, BigDecimal> claimsByType = new TreeMap<>();
        for (Claim c : approvedClaims) {
            String type = (c.getApplication() != null && c.getApplication().getInsurancePackage() != null)
                    ? c.getApplication().getInsurancePackage().getType() : "OTHER";
            claimsByType.merge(type, c.getAmount(), BigDecimal::add);
        }

        // Agent performance
        List<Map<String, Object>> agentStats = agents.stream().map(agent -> {
            long handled  = periodApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId())).count();
            long approved = periodApps.stream().filter(a -> a.getAgent() != null && a.getAgent().getId().equals(agent.getId()) && a.getStatus() == ApplicationStatus.APPROVED).count();
            long claims   = periodClaims.stream().filter(c -> c.getAgent() != null && c.getAgent().getId().equals(agent.getId())).count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",     agent.getName());
            m.put("type",     agent.getInsuranceType() != null ? agent.getInsuranceType() : "ALL");
            m.put("handled",  handled);
            m.put("approved", approved);
            m.put("claims",   claims);
            m.put("rate",     handled > 0 ? Math.round((double) approved / handled * 1000.0) / 10.0 : 0.0);
            return m;
        }).filter(m -> (long) m.get("handled") > 0 || (long) m.get("claims") > 0)
          .sorted((a, b) -> Long.compare((long) b.get("handled"), (long) a.get("handled")))
          .toList();

        // Package popularity
        List<Map<String, Object>> pkgStats = packages.stream().map(pkg -> {
            long count = periodApps.stream()
                    .filter(a -> a.getInsurancePackage() != null && a.getInsurancePackage().getId().equals(pkg.getId())).count();
            BigDecimal rev = periodPayments.stream()
                    .filter(p -> p.getApplication() != null && p.getApplication().getInsurancePackage() != null
                            && p.getApplication().getInsurancePackage().getId().equals(pkg.getId()))
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name",  pkg.getName());
            m.put("type",  pkg.getType());
            m.put("count", count);
            m.put("rev",   rev);
            return m;
        }).filter(m -> (long) m.get("count") > 0)
          .sorted((a, b) -> Long.compare((long) b.get("count"), (long) a.get("count")))
          .toList();

        // Monthly breakdown list within the period
        List<LocalDateTime> monthStarts = new ArrayList<>();
        LocalDateTime cursor = effectiveFrom.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        while (!cursor.isAfter(to)) { monthStarts.add(cursor); cursor = cursor.plusMonths(1); }

        // ── Build PDF ─────────────────────────────────────────────────────
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdfDoc = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdfDoc);
        doc.setMargins(36, 40, 36, 40);

        PdfFont regular = PdfFontUtil.bilingualFont();
        PdfFont bold    = regular;
        PdfFont oblique = regular;

        // Header
        Table header = new Table(UnitValue.createPercentArray(new float[]{58, 42})).useAllAvailableWidth();
        header.addCell(new Cell()
                .add(PdfFontUtil.paragraph("DIGITAL INSURANCE CLAIMS AND PREMIUMS").setFont(bold).setFontSize(12).setFontColor(BLUE).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("PORTAL — MYANMAR").setFont(bold).setFontSize(9).setFontColor(NAVY).setMarginBottom(3))
                .add(PdfFontUtil.paragraph("\u1012\u1005\u103a\u1002\u1000\u103a\u1010\u101a\u103a \u1021\u102c\u1019\u1001\u1036 \u1010\u1031\u102c\u1004\u103a\u1038\u1006\u102d\u102f\u1019\u103a\u1014\u103e\u1004\u1037\u103a \u1000\u103c\u1031\u102c\u1004\u103a\u1038\u1004\u103d\u1031 \u1015\u1031\u102c\u103a\u1010\u101a\u103a \u2014 \u1019\u103c\u1014\u103a\u1019\u102c").setFont(oblique).setFontSize(7.5f).setFontColor(GRAY))
                .setBorder(Border.NO_BORDER).setPadding(4));
        header.addCell(new Cell()
                .add(PdfFontUtil.paragraph("PERIOD ANALYTICS REPORT").setFont(bold).setFontSize(10).setFontColor(BLUE).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("(Monthly Reset Export)").setFont(oblique).setFontSize(8f).setFontColor(GRAY).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(5))
                .add(PdfFontUtil.paragraph("From: " + fromLabel).setFont(bold).setFontSize(8f).setFontColor(NAVY).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("  To: " + toLabel).setFont(bold).setFontSize(8f).setFontColor(NAVY).setTextAlignment(TextAlignment.RIGHT).setMarginBottom(2))
                .add(PdfFontUtil.paragraph("Generated: " + generatedAt).setFont(regular).setFontSize(8).setFontColor(GRAY).setTextAlignment(TextAlignment.RIGHT))
                .setBorder(Border.NO_BORDER).setPadding(4));
        doc.add(header);

        Table bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        bar.addCell(new Cell()
                .add(PdfFontUtil.paragraph("PERIOD REPORT: " + periodLabel.toUpperCase())
                        .setFont(bold).setFontSize(10).setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(BLUE).setPadding(6).setBorder(Border.NO_BORDER));
        doc.add(bar);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(6));

        // S1: Executive Summary
        sectionHeader(doc, bold, "SECTION 1: EXECUTIVE FINANCIAL SUMMARY   (ဘဏ္ဍာရေး အကျဉ်းချုပ်)");
        Table sumTable = new Table(UnitValue.createPercentArray(new float[]{34, 33, 33})).useAllAvailableWidth();
        addSummaryCell(sumTable, bold, regular, "PREMIUM INCOME (\u1000\u103a\u1004\u103a\u1038\u1004\u103d\u1031)", fmt(totalRevenue) + " MMK", GREEN);
        addSummaryCell(sumTable, bold, regular, "CLAIM PAYOUT (\u1011\u103d\u1000\u103a\u1004\u103d\u1031)", fmt(totalClaimsPaid) + " MMK", RED);
        DeviceRgb profitColor = netProfit.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED;
        addSummaryCell(sumTable, bold, regular, "NET PROFIT (\u1021\u1019\u103c\u1010\u103a/\u1021\u1006\u102f\u1036\u1038)", (netProfit.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(netProfit) + " MMK", profitColor);
        doc.add(sumTable);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(4));
        Table kpi = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        DeviceRgb lrColor = lossRatio < 60 ? GREEN : lossRatio < 80 ? AMBER : RED;
        DeviceRgb pmColor = profitMargin >= 20 ? GREEN : profitMargin >= 0 ? AMBER : RED;
        addKpiCell(kpi, bold, regular, "Loss Ratio (ဆုံးရှုံးမှု အချိုး)", String.format("%.1f%%", lossRatio), lossRatio < 60 ? "Good (ကောင်း)" : lossRatio < 80 ? "Caution (သတိပြုရန်)" : "High Risk (အန္တရာယ်မြင့်)", lrColor);
        addKpiCell(kpi, bold, regular, "Profit Margin (အမြတ် ရာခိုင်နှုန်း)", String.format("%.1f%%", profitMargin), profitMargin >= 20 ? "Good (ကောင်း)" : profitMargin >= 0 ? "Low (နည်း)" : "Loss (အရှုံး)", pmColor);
        doc.add(kpi);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));

        // S2: Application & Claim Statistics
        sectionHeader(doc, bold, "SECTION 2: APPLICATION & CLAIM STATISTICS   (\u101c\u103b\u103e\u1031\u102c\u1006\u103c\u102c\u1014\u103e\u1004\u1037\u103a \u1021\u1015\u102d\u102f\u1004\u103a\u1038 Claim \u1005\u102c\u101b\u1004\u103a)");
        Table statsTable = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        Table appsInner = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        tableHeaderRow(appsInner, bold, NAVY, new String[]{"Applications (လျှောက်လွှာ)", "Count (အရေအတွက်)"});
        tableRow(appsInner, regular, "Total Applications (စုစုပေါင်း)", String.valueOf(periodApps.size()));
        tableRow(appsInner, regular, "Approved (အတည်ပြုပြီး)", String.valueOf(approvedApps));
        tableRow(appsInner, regular, "Pending (စောင့်ဆိုင်းဆဲ)",  String.valueOf(pendingApps));
        tableRow(appsInner, regular, "Rejected (ငြင်းပယ်ပြီး)", String.valueOf(rejectedApps));
        Table claimsInner = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        tableHeaderRow(claimsInner, bold, NAVY, new String[]{"Claims (တောင်းဆိုမှု)", "Count (အရေအတွက်)"});
        tableRow(claimsInner, regular, "Total Claims (စုစုပေါင်း)",    String.valueOf(periodClaims.size()));
        tableRow(claimsInner, regular, "Approved (အတည်ပြုပြီး)", String.valueOf(approvedClaimsCount));
        tableRow(claimsInner, regular, "Pending (စောင့်ဆိုင်းဆဲ)",  String.valueOf(pendingClaims));
        tableRow(claimsInner, regular, "Rejected (ငြင်းပယ်ပြီး)", String.valueOf(rejectedClaims));
        statsTable.addCell(new Cell().add(appsInner).setBorder(Border.NO_BORDER).setPaddingRight(6));
        statsTable.addCell(new Cell().add(claimsInner).setBorder(Border.NO_BORDER).setPaddingLeft(6));
        doc.add(statsTable);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));

        // S3: By Insurance Type
        if (!revenueByType.isEmpty() || !claimsByType.isEmpty()) {
            sectionHeader(doc, bold, "SECTION 3: FINANCIAL BREAKDOWN BY INSURANCE TYPE   (\u1021\u102c\u1019\u1001\u1036 \u1021\u1019\u103b\u102d\u102f\u1021\u1005\u102c\u1021\u101c\u102d\u102f\u1000\u103a)");
            Table typeTable = new Table(UnitValue.createPercentArray(new float[]{28, 24, 24, 24})).useAllAvailableWidth();
            tableHeaderRow(typeTable, bold, NAVY, new String[]{"Insurance Type (အာမခံအမျိုးအစား)", "Premium Income (ပရီမီယံဝင်ငွေ)", "Claim Payout (လျော်ကြေးပေးငွေ)", "Net Profit (အသားတင်အမြတ်)"});
            Set<String> allTypes = new TreeSet<>();
            allTypes.addAll(revenueByType.keySet()); allTypes.addAll(claimsByType.keySet());
            BigDecimal gRev = BigDecimal.ZERO, gClaim = BigDecimal.ZERO;
            for (String type : allTypes) {
                BigDecimal rev = revenueByType.getOrDefault(type, BigDecimal.ZERO);
                BigDecimal clm = claimsByType.getOrDefault(type, BigDecimal.ZERO);
                BigDecimal pft = rev.subtract(clm);
                gRev = gRev.add(rev); gClaim = gClaim.add(clm);
                typeTable.addCell(cellOf(type, bold, 8.5f));
                typeTable.addCell(cellOf(fmt(rev), regular, 8.5f).setFontColor(GREEN));
                typeTable.addCell(cellOf(clm.compareTo(BigDecimal.ZERO) > 0 ? fmt(clm) : "\u2014", regular, 8.5f).setFontColor(clm.compareTo(BigDecimal.ZERO) > 0 ? RED : GRAY));
                typeTable.addCell(cellOf((pft.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(pft), bold, 8.5f).setFontColor(pft.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED));
            }
            BigDecimal gProfit = gRev.subtract(gClaim);
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph("TOTAL (စုစုပေါင်း)").setFont(bold).setFontSize(8.5f)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(gRev)).setFont(bold).setFontSize(8.5f).setFontColor(GREEN)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(gClaim)).setFont(bold).setFontSize(8.5f).setFontColor(RED)).setBackgroundColor(LIGHT).setPadding(4));
            typeTable.addCell(new Cell().add(PdfFontUtil.paragraph((gProfit.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(gProfit)).setFont(bold).setFontSize(8.5f).setFontColor(gProfit.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED)).setBackgroundColor(LIGHT).setPadding(4));
            doc.add(typeTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // S4: Premium Wallet Summary
        sectionHeader(doc, bold, "SECTION 4: PREMIUM WALLET SUMMARY   (\u1015\u101b\u102e\u1019\u102e\u101a\u1036 \u1015\u102d\u102f\u1000\u103a\u1006\u1036\u1015\u102f\u1038 \u1021\u1000\u103b\u1031\u102c\u1038\u1001\u103b\u102f\u1015\u103a)");
        {
            BigDecimal balance = totalRevenue.subtract(totalClaimsPaid);
            Table wTable = new Table(UnitValue.createPercentArray(new float[]{34, 33, 33})).useAllAvailableWidth();
            addSummaryCell(wTable, bold, regular, "TOTAL INFLOW - Premiums (စုစုပေါင်း ဝင်ငွေ)", fmt(totalRevenue) + " MMK", GREEN);
            addSummaryCell(wTable, bold, regular, "TOTAL OUTFLOW - Claims (စုစုပေါင်း ထွက်ငွေ)", fmt(totalClaimsPaid) + " MMK", RED);
            DeviceRgb wc = balance.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED;
            addSummaryCell(wTable, bold, regular, "WALLET BALANCE (လက်ကျန်ငွေ)", (balance.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(balance) + " MMK", wc);
            doc.add(wTable);
            // Top contributors
            Map<Long, Object[]> custMap = new LinkedHashMap<>();
            for (Payment p : periodPayments) {
                if (p.getCustomer() == null) continue;
                Long cid = p.getCustomer().getId();
                custMap.computeIfAbsent(cid, id -> new Object[]{ p.getCustomer().getName(), BigDecimal.ZERO, 0 });
                Object[] row = custMap.get(cid);
                row[1] = ((BigDecimal) row[1]).add(p.getAmount());
                row[2] = (int) row[2] + 1;
            }
            List<Object[]> topCusts = custMap.values().stream()
                    .sorted((a, b) -> ((BigDecimal) b[1]).compareTo((BigDecimal) a[1]))
                    .limit(10).toList();
            if (!topCusts.isEmpty()) {
                doc.add(PdfFontUtil.paragraph("").setMarginBottom(4));
                doc.add(PdfFontUtil.paragraph("Top Premium Contributors (ပရီမီယံ အများဆုံးပေးသူများ)").setFont(bold).setFontSize(9).setFontColor(NAVY).setMarginBottom(4));
                Table cTable = new Table(UnitValue.createPercentArray(new float[]{50, 30, 20})).useAllAvailableWidth();
                tableHeaderRow(cTable, bold, NAVY, new String[]{"Customer (ဖောက်သည်)", "Total Paid (စုစုပေါင်းပေးငွေ)", "Payments (ပေးချေမှုအရေအတွက်)"});
                for (Object[] row : topCusts) {
                    cTable.addCell(cellOf((String) row[0], bold, 8.5f));
                    cTable.addCell(cellOf(fmt((BigDecimal) row[1]), regular, 8.5f).setFontColor(GREEN));
                    cTable.addCell(cellOf(String.valueOf(row[2]), regular, 8.5f));
                }
                doc.add(cTable);
            }
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // S5: Agent Performance
        sectionHeader(doc, bold, "SECTION 5: AGENT PERFORMANCE   (Agent \u101c\u102f\u1015\u103a\u1006\u1031\u102c\u1004\u103a\u1019\u103e\u1000\u103a)");
        if (agentStats.isEmpty()) {
            doc.add(PdfFontUtil.paragraph("No agent activity recorded for this period. (ဤကာလအတွက် Agent လုပ်ဆောင်မှု မရှိပါ။)").setFont(oblique).setFontSize(9).setFontColor(GRAY).setMarginBottom(8));
        } else {
            Table aTable = new Table(UnitValue.createPercentArray(new float[]{30, 18, 14, 14, 14, 10})).useAllAvailableWidth();
            tableHeaderRow(aTable, bold, NAVY, new String[]{"Agent (ကိုယ်စားလှယ်)", "Type (အမျိုးအစား)", "Applications (လျှောက်လွှာ)", "Approved (အတည်ပြု)", "Claims (တောင်းဆိုမှု)", "Rate (နှုန်း)"});
            for (Map<String, Object> a : agentStats) {
                double rate = (double) a.get("rate");
                DeviceRgb rc = rate >= 70 ? GREEN : rate >= 40 ? AMBER : RED;
                aTable.addCell(cellOf((String) a.get("name"), bold, 8.5f));
                aTable.addCell(cellOf((String) a.get("type"), regular, 8.5f));
                aTable.addCell(cellOf(String.valueOf(a.get("handled")), regular, 8.5f));
                aTable.addCell(cellOf(String.valueOf(a.get("approved")), regular, 8.5f).setFontColor(GREEN));
                aTable.addCell(cellOf(String.valueOf(a.get("claims")), regular, 8.5f).setFontColor(AMBER));
                aTable.addCell(new Cell().add(PdfFontUtil.paragraph(String.format("%.1f%%", rate)).setFont(bold).setFontSize(8.5f).setFontColor(rc)).setPadding(4));
            }
            doc.add(aTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // S6: Package Popularity
        sectionHeader(doc, bold, "SECTION 6: PLAN POPULARITY   (Plan \u101b\u1031\u1015\u1014\u103a\u1038\u1005\u102c\u101b\u1019\u103e\u1000\u103a)");
        if (pkgStats.isEmpty()) {
            doc.add(PdfFontUtil.paragraph("No package applications recorded for this period. (ဤကာလအတွက် Plan လျှောက်လွှာ မရှိပါ။)").setFont(oblique).setFontSize(9).setFontColor(GRAY).setMarginBottom(8));
        } else {
            Table pTable = new Table(UnitValue.createPercentArray(new float[]{40, 22, 18, 20})).useAllAvailableWidth();
            tableHeaderRow(pTable, bold, NAVY, new String[]{"Package Name (Plan အမည်)", "Type (အမျိုးအစား)", "Applications (လျှောက်လွှာ)", "Revenue (ဝင်ငွေ)"});
            for (Map<String, Object> p : pkgStats) {
                pTable.addCell(cellOf((String) p.get("name"), bold, 8.5f));
                pTable.addCell(cellOf((String) p.get("type"), regular, 8.5f));
                pTable.addCell(cellOf(String.valueOf(p.get("count")), regular, 8.5f));
                pTable.addCell(cellOf(fmt((BigDecimal) p.get("rev")), regular, 8.5f).setFontColor(GREEN));
            }
            doc.add(pTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // S7: Monthly Breakdown — Application Analytics
        if (!monthStarts.isEmpty()) {
            sectionHeader(doc, bold, "SECTION 7: MONTHLY BREAKDOWN \u2014 APPLICATION ANALYTICS   (\u101c\u1005\u1031\u102c\u1001\u103c\u102c\u1038\u1005\u102d\u1014\u103a\u1016\u102c)");
            Table mTable = new Table(UnitValue.createPercentArray(new float[]{20, 22, 22, 22, 14})).useAllAvailableWidth();
            tableHeaderRow(mTable, bold, NAVY, new String[]{"Month (လ)", "Revenue (ဝင်ငွေ)", "Claims (လျော်ကြေး)", "Net (အသားတင်)", "Applications (လျှောက်လွှာ)"});
            DateTimeFormatter mFmt = DateTimeFormatter.ofPattern("MMM yyyy");
            BigDecimal gRev = BigDecimal.ZERO, gClaim = BigDecimal.ZERO; long gApps = 0;
            for (LocalDateTime ms : monthStarts) {
                LocalDateTime me   = ms.plusMonths(1).minusNanos(1);
                LocalDateTime from2 = ms.isBefore(effectiveFrom) ? effectiveFrom : ms;
                LocalDateTime to2   = me.isAfter(to)             ? to             : me;
                BigDecimal mRev = periodPayments.stream()
                        .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(from2) && !p.getCreatedAt().isAfter(to2))
                        .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal mClaim = approvedClaims.stream()
                        .filter(c -> c.getCreatedAt() != null && !c.getCreatedAt().isBefore(from2) && !c.getCreatedAt().isAfter(to2))
                        .map(Claim::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                long mApps = periodApps.stream()
                        .filter(a -> a.getCreatedAt() != null && !a.getCreatedAt().isBefore(from2) && !a.getCreatedAt().isAfter(to2))
                        .count();
                BigDecimal mNet = mRev.subtract(mClaim);
                gRev = gRev.add(mRev); gClaim = gClaim.add(mClaim); gApps += mApps;
                mTable.addCell(cellOf(ms.format(mFmt), bold, 8.5f));
                mTable.addCell(cellOf(mRev.compareTo(BigDecimal.ZERO) > 0 ? fmt(mRev) : "\u2014", regular, 8.5f).setFontColor(mRev.compareTo(BigDecimal.ZERO) > 0 ? GREEN : GRAY));
                mTable.addCell(cellOf(mClaim.compareTo(BigDecimal.ZERO) > 0 ? fmt(mClaim) : "\u2014", regular, 8.5f).setFontColor(mClaim.compareTo(BigDecimal.ZERO) > 0 ? RED : GRAY));
                mTable.addCell(cellOf((mNet.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(mNet), bold, 8.5f).setFontColor(mNet.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED));
                mTable.addCell(cellOf(String.valueOf(mApps), regular, 8.5f));
            }
            BigDecimal gNet = gRev.subtract(gClaim);
            mTable.addCell(new Cell().add(PdfFontUtil.paragraph("TOTAL (စုစုပေါင်း)").setFont(bold).setFontSize(8.5f)).setBackgroundColor(LIGHT).setPadding(4));
            mTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(gRev)).setFont(bold).setFontSize(8.5f).setFontColor(GREEN)).setBackgroundColor(LIGHT).setPadding(4));
            mTable.addCell(new Cell().add(PdfFontUtil.paragraph(fmt(gClaim)).setFont(bold).setFontSize(8.5f).setFontColor(RED)).setBackgroundColor(LIGHT).setPadding(4));
            mTable.addCell(new Cell().add(PdfFontUtil.paragraph((gNet.compareTo(BigDecimal.ZERO) >= 0 ? "+" : "") + fmt(gNet)).setFont(bold).setFontSize(8.5f).setFontColor(gNet.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED)).setBackgroundColor(LIGHT).setPadding(4));
            mTable.addCell(new Cell().add(PdfFontUtil.paragraph(String.valueOf(gApps)).setFont(bold).setFontSize(8.5f)).setBackgroundColor(LIGHT).setPadding(4));
            doc.add(mTable);
            doc.add(PdfFontUtil.paragraph("").setMarginBottom(8));
        }

        // Footer
        Table footer = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        footer.addCell(new Cell()
                .add(PdfFontUtil.paragraph("This report is auto-generated by the Digital Insurance Claims and Premiums Portal \u2014 Myanmar.\n"
                        + "Generated on: " + generatedAt + "   |   Period: " + periodLabel)
                        .setFont(oblique).setFontSize(7.5f).setFontColor(GRAY).setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(LIGHT).setPadding(8).setBorder(new SolidBorder(LIGHT, 1)));
        doc.add(footer);
        doc.close();
        return baos.toByteArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static boolean inMonth(LocalDateTime dt, int year, int month) {
        return dt != null && dt.getYear() == year && dt.getMonthValue() == month;
    }

    /** True when dt falls within [from, to] inclusive. */
    private static boolean inPeriod(LocalDateTime dt, LocalDateTime from, LocalDateTime to) {
        return dt != null && !dt.isBefore(from) && !dt.isAfter(to);
    }

    private static String fmt(BigDecimal v) {
        if (v == null) return "0";
        return String.format("%,.0f", v.doubleValue());
    }

    private static void sectionHeader(Document doc, PdfFont bold, String title) {
        Table t = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        t.addCell(new Cell()
                .add(PdfFontUtil.paragraph(title).setFont(bold).setFontSize(9).setFontColor(ColorConstants.WHITE))
                .setBackgroundColor(NAVY).setPadding(5).setBorder(Border.NO_BORDER)
                .setMarginBottom(0));
        doc.add(t);
        doc.add(PdfFontUtil.paragraph("").setMarginBottom(4));
    }

    private static void addSummaryCell(Table t, PdfFont bold, PdfFont regular, String label, String value, DeviceRgb color) {
        t.addCell(new Cell()
                .add(PdfFontUtil.paragraph(label).setFont(regular).setFontSize(7.5f).setFontColor(GRAY).setMarginBottom(4))
                .add(PdfFontUtil.paragraph(value).setFont(bold).setFontSize(11).setFontColor(color))
                .setBackgroundColor(LIGHT).setPadding(8).setBorder(new SolidBorder(color, 1.5f))
                .setMarginRight(4));
    }

    private static void addKpiCell(Table t, PdfFont bold, PdfFont regular, String label, String value, String note, DeviceRgb color) {
        t.addCell(new Cell()
                .add(PdfFontUtil.paragraph(label).setFont(regular).setFontSize(8).setFontColor(GRAY).setMarginBottom(2))
                .add(PdfFontUtil.paragraph(value).setFont(bold).setFontSize(14).setFontColor(color).setMarginBottom(2))
                .add(PdfFontUtil.paragraph(note).setFont(bold).setFontSize(8).setFontColor(color))
                .setPadding(8).setBorder(new SolidBorder(LIGHT, 1)).setMarginRight(4));
    }

    private static void tableHeaderRow(Table t, PdfFont bold, DeviceRgb bg, String[] headers) {
        for (String h : headers) {
            t.addHeaderCell(new Cell()
                    .add(PdfFontUtil.paragraph(h).setFont(bold).setFontSize(8).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(bg).setPadding(5));
        }
    }

    private static void tableRow(Table t, PdfFont regular, String label, String value) {
        t.addCell(cellOf(label, regular, 8.5f));
        t.addCell(cellOf(value, regular, 8.5f).setTextAlignment(TextAlignment.RIGHT));
    }

    private static Cell cellOf(String text, PdfFont font, float size) {
        return new Cell().add(PdfFontUtil.paragraph(text != null ? text : "—").setFont(font).setFontSize(size)).setPadding(4);
    }
}
