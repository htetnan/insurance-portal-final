package com.insurance.portal.dto;

import com.insurance.portal.model.User;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String phone;
    private String address;
    private String insuranceType;
    private boolean active;
    private LocalDateTime createdAt;
    private boolean hasProfilePicture;

    public static UserResponse from(User user) {
        UserResponse dto = new UserResponse();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().name());
        dto.setPhone(user.getPhone());
        dto.setAddress(user.getAddress());
        dto.setInsuranceType(user.getInsuranceType());
        dto.setActive(user.isActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setHasProfilePicture(user.getProfilePicture() != null && !user.getProfilePicture().isBlank());
        return dto;
    }
}
