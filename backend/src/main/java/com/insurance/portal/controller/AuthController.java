package com.insurance.portal.controller;

import com.insurance.portal.dto.*;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.Role;
import com.insurance.portal.repository.UserRepository;
import com.insurance.portal.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.insurance.portal.util.FileStorageUtil;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        String token = tokenProvider.generateToken(req.getEmail());
        User user = userRepository.findByEmail(req.getEmail()).orElseThrow();
        return ResponseEntity.ok(new AuthResponse(token, UserResponse.from(user)));
    }

    /** Check whether an email address is available (not yet registered). */
    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(409).body(new ErrorResponse("Email already in use"));
        }
        return ResponseEntity.ok(Map.of("available", true));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Email already in use"));
        }
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(Role.CUSTOMER)
                .phone(req.getPhone())
                .address(req.getAddress())
                .active(true)
                .build();
        userRepository.save(user);
        String token = tokenProvider.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, UserResponse.from(user)));
    }

    @PostMapping("/google")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String accessToken = body.get("accessToken");
        if (accessToken == null || accessToken.isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Missing Google access token"));
        }

        // Verify token and fetch profile from Google
        Map<String, String> info;
        try {
            RestTemplate restTemplate = new RestTemplate();
            info = restTemplate.getForObject(
                "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + accessToken,
                Map.class
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Invalid or expired Google token"));
        }

        if (info == null || info.get("email") == null) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Could not retrieve Google account info"));
        }

        String email = info.get("email");
        String name  = info.getOrDefault("name", email.split("@")[0]);

        // Find existing user or create a new CUSTOMER account
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .name(name)
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .role(Role.CUSTOMER)
                    .active(true)
                    .build();
            return userRepository.save(newUser);
        });

        String token = tokenProvider.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, UserResponse.from(user)));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /**
     * Self-service profile update.
     * - ADMIN: may edit name, email, phone, address, and password.
     * - CUSTOMER: name/email are locked (core identity fields) — phone,
     *   address, and password may be changed here.
     * - AGENT: not allowed to self-edit; only an admin can update an agent's
     *   profile (see AdminController#updateUser).
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserDetails principal,
                                            @RequestBody UpdateProfileRequest req) {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();

        if (user.getRole() == Role.AGENT) {
            return ResponseEntity.status(403).body(new ErrorResponse(
                    "Agent profiles can only be updated by an admin. Please contact your administrator."));
        }

        if (user.getRole() == Role.ADMIN) {
            if (req.getName() != null && !req.getName().isBlank()) user.setName(req.getName());
            if (req.getEmail() != null && !req.getEmail().isBlank() && !req.getEmail().equalsIgnoreCase(user.getEmail())) {
                if (!com.insurance.portal.util.EmailValidationUtil.isValid(req.getEmail())) {
                    return ResponseEntity.badRequest().body(new ErrorResponse(com.insurance.portal.util.EmailValidationUtil.ERROR_MESSAGE));
                }
                if (userRepository.existsByEmail(req.getEmail())) {
                    return ResponseEntity.badRequest().body(new ErrorResponse("Email already in use"));
                }
                user.setEmail(req.getEmail());
            }
            if (req.getPhone() != null) user.setPhone(req.getPhone());
            if (req.getAddress() != null) user.setAddress(req.getAddress());
        } else {
            // CUSTOMER — name and email are locked (core identity); phone, address
            // (and password below) may change.
            if (req.getPhone() != null) user.setPhone(req.getPhone());
            if (req.getAddress() != null) user.setAddress(req.getAddress());
        }

        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            if (req.getCurrentPassword() == null || !passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Current password is incorrect"));
            }
            if (!com.insurance.portal.util.PasswordValidationUtil.isStrong(req.getNewPassword())) {
                return ResponseEntity.badRequest().body(new ErrorResponse(com.insurance.portal.util.PasswordValidationUtil.ERROR_MESSAGE));
            }
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /**
     * Change the current user's password via the "forgot password" email-OTP
     * flow instead of re-entering the current password. The OTP itself is
     * generated/verified client-side (same trust model as the public
     * forgot-password flow) — this endpoint only requires the caller to
     * already be authenticated as the account holder, and applies the same
     * role rule as {@link #updateProfile}: agents cannot self-edit.
     */
    @PutMapping("/profile/password-otp")
    public ResponseEntity<?> changePasswordViaOtp(@AuthenticationPrincipal UserDetails principal,
                                                    @RequestBody Map<String, String> body) {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        if (user.getRole() == Role.AGENT) {
            return ResponseEntity.status(403).body(new ErrorResponse(
                    "Agent profiles can only be updated by an admin. Please contact your administrator."));
        }
        String newPassword = body.get("newPassword");
        if (!com.insurance.portal.util.PasswordValidationUtil.isStrong(newPassword)) {
            return ResponseEntity.badRequest().body(new ErrorResponse(com.insurance.portal.util.PasswordValidationUtil.ERROR_MESSAGE));
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /**
     * Upload/replace the current user's own profile picture.
     * All authenticated roles may change only their own photo. Agent profile fields
     * remain administrator-controlled via updateProfile.
     */
    @PostMapping(value = "/profile/picture", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadOwnPicture(@AuthenticationPrincipal UserDetails principal,
                                               @RequestParam("file") MultipartFile file) {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        try {
            String oldPath = user.getProfilePicture();
            String newPath = FileStorageUtil.saveImage(file, "profile-pictures", "user_" + user.getId());
            if (newPath == null) {
                return ResponseEntity.badRequest().body(new ErrorResponse("No file provided"));
            }
            user.setProfilePicture(newPath);
            userRepository.save(user);
            FileStorageUtil.deleteFileQuietly(oldPath);
            return ResponseEntity.ok(UserResponse.from(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    /** Stream the current user's own profile picture. */
    @GetMapping("/profile/picture")
    public ResponseEntity<?> getOwnPicture(@AuthenticationPrincipal UserDetails principal) throws IOException {
        User user = userRepository.findByEmail(principal.getUsername()).orElseThrow();
        String path = user.getProfilePicture();
        if (path == null || path.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        return FileStorageUtil.streamFile(path);
    }

    record ErrorResponse(String message) {}
}
