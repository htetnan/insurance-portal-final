package com.insurance.portal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String name;

    @NotBlank @Email
    @Size(max = 30, message = "Email must not exceed 30 characters")
    @Pattern(
        regexp = "^[a-z][a-z0-9.]*@[a-z0-9.-]+\\.[a-z]{2,}$",
        message = "Email must be lowercase only, use letters/digits/dots only (no special characters), max 30 characters"
    )
    private String email;

    // Full strength check is applied in AuthController; @Size here is a safety net
    @NotBlank @Size(min = 8)
    private String password;

    private String phone;
    private String address;
}
