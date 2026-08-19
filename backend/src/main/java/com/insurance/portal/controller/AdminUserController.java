package com.insurance.portal.controller;

import com.insurance.portal.dto.UpdateProfileRequest;
import com.insurance.portal.dto.UserResponse;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.Role;
import com.insurance.portal.repository.UserRepository;
import com.insurance.portal.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepo;
    private final AdminUserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<UserResponse> getUsers() {
        return userRepo.findAll().stream().map(UserResponse::from).toList();
    }


    @GetMapping("/page")
    @Transactional(readOnly = true)
    public Map<String, Object> getUsersPage(
            @RequestParam(defaultValue = "CUSTOMER") Role role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search) {
        int safeSize = Math.min(Math.max(size, 5), 100);
        var pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = (search == null || search.isBlank() ? userRepo.findAllByRole(role, pageable) : userRepo.searchByRole(role, search.trim(), pageable)).map(UserResponse::from);
        return Map.of("content", result.getContent(), "page", result.getNumber(), "size", result.getSize(),
                "totalElements", result.getTotalElements(), "totalPages", result.getTotalPages(),
                "customerCount", userRepo.countByRole(Role.CUSTOMER), "agentCount", userRepo.countByRole(Role.AGENT));
    }

    @PostMapping("/agents")
    public ResponseEntity<?> createAgent(@RequestBody Map<String, Object> req) {
        return userService.createAgent(req);
    }

    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(@RequestBody Map<String, Object> req) {
        return userService.createAdmin(req);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UpdateProfileRequest req) {
        return userService.updateUser(id, req);
    }

    @PostMapping(value = "/{id}/picture", consumes = "multipart/form-data")
    public ResponseEntity<?> uploadPicture(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return userService.uploadPicture(id, file);
    }

    @GetMapping("/{id}/picture")
    public ResponseEntity<?> getPicture(@PathVariable Long id) throws java.io.IOException {
        return userService.getPicture(id);
    }

    @PutMapping("/{id}/toggle")
    @Transactional
    public ResponseEntity<?> toggleUser(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(Boolean.TRUE.equals(req.get("active")));
        return ResponseEntity.ok(UserResponse.from(userRepo.save(user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userService.deleteUser(id);
    }
}
