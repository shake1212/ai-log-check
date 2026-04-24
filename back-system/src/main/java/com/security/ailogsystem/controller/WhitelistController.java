package com.security.ailogsystem.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/whitelist")
@CrossOrigin(origins = "*")
public class WhitelistController {

    private final Map<String, Map<String, Object>> entries = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getWhitelist() {
        return ResponseEntity.ok(new ArrayList<>(entries.values()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createWhitelistEntry(@RequestBody Map<String, Object> payload) {
        String id = "wl-" + System.currentTimeMillis();
        Map<String, Object> item = new HashMap<>(payload);
        item.put("id", id);
        item.put("createdAt", LocalDateTime.now().toString());
        item.put("updatedAt", LocalDateTime.now().toString());
        entries.put(id, item);
        return ResponseEntity.ok(item);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateWhitelistEntry(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        Map<String, Object> existing = entries.get(id);
        if (existing == null) return ResponseEntity.notFound().build();
        existing.putAll(payload);
        existing.put("updatedAt", LocalDateTime.now().toString());
        return ResponseEntity.ok(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWhitelistEntry(@PathVariable String id) {
        entries.remove(id);
        return ResponseEntity.ok().build();
    }
}
