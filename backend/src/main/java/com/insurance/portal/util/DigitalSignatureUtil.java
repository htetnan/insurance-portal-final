package com.insurance.portal.util;

import java.util.Base64;

/**
 * Validates signatures drawn by the browser canvas before they are persisted.
 * Signatures are intentionally stored as data URLs so they can be displayed
 * without exposing a public file endpoint.
 */
public final class DigitalSignatureUtil {

    private static final int MAX_SIGNATURE_LENGTH = 2_000_000;

    private DigitalSignatureUtil() {}

    /**
     * @return null when valid, otherwise a user-safe validation message
     */
    public static String validationError(String signature) {
        if (signature == null || signature.isBlank()) {
            return "Digital signature is required";
        }
        if (signature.length() > MAX_SIGNATURE_LENGTH) {
            return "Digital signature is too large";
        }
        int comma = signature.indexOf(',');
        if (comma <= 0 || !signature.substring(0, comma)
                .matches("data:image/(png|jpeg|jpg);base64")) {
            return "Invalid digital signature format";
        }
        try {
            if (Base64.getDecoder().decode(signature.substring(comma + 1)).length == 0) {
                return "Digital signature is empty";
            }
        } catch (IllegalArgumentException ex) {
            return "Invalid digital signature data";
        }
        return null;
    }
}