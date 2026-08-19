package com.insurance.portal.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Year;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Domain helpers for policy calculations extracted from CustomerController.
 * Covers risk scoring, premium calculation, policy number generation,
 * and dynamic form file-upload processing.
 */
@Service
public class PolicyService {

    /**
     * Derives a risk level (LOW / MEDIUM / HIGH) from applicant and policy data.
     * Scoring rules:
     *   Age > 55 → +3 pts, age > 40 → +1 pt
     *   LIFE:   smoking → +2 pts, hasDisease → +2 pts
     *   HEALTH: existingDiseases present → +2 pts
     *   MOTOR/VEHICLE: vehicle age > 10 yrs → +3 pts, > 5 yrs → +1 pt
     */
    public String calculateRisk(String type, String commonInfoJson, String extraInfoJson) {
        int score = 0;
        try {
            if (commonInfoJson != null) {
                Matcher m = Pattern.compile("\"dob\"\\s*:\\s*\"(\\d{4})-").matcher(commonInfoJson);
                if (m.find()) {
                    int age = Year.now().getValue() - Integer.parseInt(m.group(1));
                    if (age > 55) score += 3; else if (age > 40) score += 1;
                }
            }
            if (extraInfoJson != null) {
                if ("LIFE".equals(type)) {
                    if (extraInfoJson.contains("\"smoking\":true"))    score += 2;
                    if (extraInfoJson.contains("\"hasDisease\":true")) score += 2;
                }
                if ("HEALTH".equals(type)
                        && extraInfoJson.contains("\"existingDiseases\"")
                        && !extraInfoJson.contains("\"existingDiseases\":\"\"")
                        && !extraInfoJson.contains("\"existingDiseases\":null")) {
                    score += 2;
                }
                if ("MOTOR".equals(type) || "VEHICLE".equals(type)) {
                    Matcher m = Pattern.compile("\"vehicleYear\"\\s*:\\s*\"?(\\d{4})").matcher(extraInfoJson);
                    if (m.find()) {
                        int vehicleAge = Year.now().getValue() - Integer.parseInt(m.group(1));
                        if (vehicleAge > 10) score += 3; else if (vehicleAge > 5) score += 1;
                    }
                }
            }
        } catch (Exception ignored) {}
        return score <= 1 ? "LOW" : score <= 3 ? "MEDIUM" : "HIGH";
    }

    /**
     * Calculates total premium from coverage, rate, duration (years) and risk multiplier.
     * Multipliers: HIGH → ×1.5, MEDIUM → ×1.2, LOW → ×1.0
     */
    public BigDecimal calculatePremium(BigDecimal coverage, BigDecimal rate, int duration, String risk) {
        if (rate == null) return BigDecimal.ZERO;
        double multiplier = "HIGH".equals(risk) ? 1.5 : "MEDIUM".equals(risk) ? 1.2 : 1.0;
        return coverage
                .multiply(rate)
                .multiply(BigDecimal.valueOf(duration))
                .multiply(BigDecimal.valueOf(multiplier))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Generates a unique policy number in the format POL-{TYPE}-{YEAR}-{RANDOM}.
     */
    public String generatePolicyNumber(String type) {
        String prefix = (type != null && type.length() >= 3) ? type.substring(0, 3).toUpperCase() : "INS";
        int year = Year.now().getValue();
        int rand = (int) (Math.random() * 900_000) + 100_000;
        return String.format("POL-%s-%d-%06d", prefix, year, rand);
    }
}
