package com.insurance.portal.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class ContactController {

    @PostMapping("/contact")
    public ResponseEntity<?> contact(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(Map.of("message", "Message received. We will get back to you within 24 hours."));
    }
}
