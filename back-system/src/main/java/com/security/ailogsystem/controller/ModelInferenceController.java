package com.security.ailogsystem.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@CrossOrigin(origins = "*")
public class ModelInferenceController {

    @PostMapping("/predict")
    public ResponseEntity<Map<String, Object>> predict(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "FAILED");
        response.put("message", "Model inference service is not configured");
        response.put("available", false);
        response.put("path", "/predict");
        return ResponseEntity.status(503).body(response);
    }

    @PostMapping("/batch-predict")
    public ResponseEntity<List<Map<String, Object>>> batchPredict(@RequestBody Map<String, Object> payload) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "FAILED");
        error.put("message", "Model inference service is not configured");
        error.put("available", false);
        error.put("path", "/batch-predict");
        return ResponseEntity.status(503).body(List.of(error));
    }
}
