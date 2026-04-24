package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        List<User> users = userService.findAllUsers();
        int from = Math.min(page * size, users.size());
        int to = Math.min(from + size, users.size());
        List<User> content = users.subList(from, to);
        Map<String, Object> pageData = new HashMap<>();
        pageData.put("content", content);
        pageData.put("number", page);
        pageData.put("size", size);
        pageData.put("totalElements", users.size());
        pageData.put("totalPages", size == 0 ? 1 : (int) Math.ceil(users.size() * 1.0 / size));
        return ResponseEntity.ok(pageData);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        return userService.findAllUsers().stream()
                .filter(u -> id.equals(u.getId()))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        if (user.getRole() == null) {
            user.setRole(User.UserRole.USER);
        }
        if (user.getIsActive() == null) {
            user.setIsActive(true);
        }
        return ResponseEntity.ok(userService.createUser(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User payload) {
        return userService.findAllUsers().stream()
                .filter(u -> id.equals(u.getId()))
                .findFirst()
                .map(existing -> {
                    existing.setUsername(payload.getUsername() != null ? payload.getUsername() : existing.getUsername());
                    existing.setEmail(payload.getEmail() != null ? payload.getEmail() : existing.getEmail());
                    existing.setFullName(payload.getFullName() != null ? payload.getFullName() : existing.getFullName());
                    existing.setRole(payload.getRole() != null ? payload.getRole() : existing.getRole());
                    existing.setIsActive(payload.getIsActive() != null ? payload.getIsActive() : existing.getIsActive());
                    return ResponseEntity.ok(userService.updateUser(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");
        boolean success = userService.changePassword(username, oldPassword, newPassword);
        return ResponseEntity.ok(Map.of("success", success));
    }
}
