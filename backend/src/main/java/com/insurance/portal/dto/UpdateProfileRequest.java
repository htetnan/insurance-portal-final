package com.insurance.portal.dto;

import lombok.Data;

/**
 * Used for both self-service profile updates ({@code PUT /auth/profile})
 * and admin-driven user edits ({@code PUT /admin/users/{id}}).
 * All fields are optional — only non-null/non-blank values are applied.
 */
@Data
public class UpdateProfileRequest {
    private String name;
    private String email;
    private String phone;
    private String address;
    private String insuranceType;

    // Only used when changing a password. currentPassword is required for
    // self-service changes (AuthController); admin edits skip that check.
    private String currentPassword;
    private String newPassword;
}
