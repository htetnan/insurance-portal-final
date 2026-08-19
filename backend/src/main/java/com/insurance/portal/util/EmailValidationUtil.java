package com.insurance.portal.util;

import java.util.regex.Pattern;

/**
 * Enforces the local part (before the "@") of a new/changed email address
 * to start with a lowercase letter — it must not start with a capital
 * letter or a digit. Applied wherever a user's email is created or changed
 * (registration, admin agent creation, profile edits) — not on login, so
 * existing accounts are never locked out.
 */
public final class EmailValidationUtil {

    // Rules:
    //   - local part: lowercase letter start, then lowercase letters / digits / dots only (no special chars)
    //   - domain:     lowercase letters, digits, dots, hyphens (standard domain chars)
    //   - TLD:        lowercase letters only, min 2 chars
    //   - no uppercase anywhere
    //   - total length ≤ 30 characters
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[a-z][a-z0-9.]*@[a-z0-9.-]+\\.[a-z]{2,}$");

    private static final int EMAIL_MAX_LENGTH = 30;

    public static final String ERROR_MESSAGE =
            "Email must be lowercase only, use letters/digits/dots only (no special characters), max 30 characters";

    private EmailValidationUtil() {}

    public static boolean isValid(String email) {
        return email != null &&
               email.length() <= EMAIL_MAX_LENGTH &&
               EMAIL_PATTERN.matcher(email).matches();
    }
}
