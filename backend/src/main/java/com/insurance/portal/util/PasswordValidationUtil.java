package com.insurance.portal.util;

import java.util.regex.Pattern;

/**
 * Validates that a password meets the application's "strong password" policy:
 *   - at least 8 characters
 *   - at least one uppercase letter (A–Z)
 *   - at least one lowercase letter (a–z)
 *   - at least one digit (0–9)
 *   - at least one special character (anything that is not A–Z, a–z, or 0–9)
 *
 * Applied wherever a password is created or changed (registration, admin
 * agent/admin creation, profile password updates).
 */
public final class PasswordValidationUtil {

    private static final Pattern STRONG_PATTERN = Pattern.compile(
            "^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$"
    );

    public static final String ERROR_MESSAGE =
            "Password must be at least 8 characters and include at least one uppercase letter, " +
            "one lowercase letter, one digit, and one special character";

    private PasswordValidationUtil() {}

    public static boolean isStrong(String password) {
        return password != null && STRONG_PATTERN.matcher(password).matches();
    }
}
