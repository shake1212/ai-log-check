package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@Tag(name = "认证管理", description = "用户认证相关接口")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AuthController(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户登录认证")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        log.info("收到登录请求，用户名: {}", username);
        
        try {
            Optional<User> userOpt = userService.findByUsername(username);
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                log.debug("查询到用户: {}, 角色: {}", user.getUsername(), user.getRole());
                
                // 验证密码：优先 BCrypt 哈希验证，兼容明文密码并自动升级
                boolean passwordValid = false;
                if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                    String stored = user.getPassword();
                    if (stored.startsWith("$2")) {
                        // 尝试 BCrypt 哈希验证
                        try {
                            passwordValid = userService.validatePassword(password, stored);
                        } catch (Exception e) {
                            log.warn("BCrypt 验证异常，尝试明文比对: {}", e.getMessage());
                        }
                    }
                    // BCrypt 验证失败或非 BCrypt 格式，尝试明文比对
                    if (!passwordValid && password.equals(stored)) {
                        passwordValid = true;
                    }
                    // 明文验证成功，升级为 BCrypt
                    if (passwordValid && !stored.startsWith("$2")) {
                        user.setPassword(passwordEncoder.encode(password));
                        userService.updateUser(user);
                        log.info("用户 {} 密码已自动升级为 BCrypt 哈希", username);
                    }
                }
                
                if (passwordValid) {
                    if (user.getIsActive() != null && user.getIsActive()) {
                        userService.updateLastLogin(username);
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("message", "登录成功");
                        response.put("token", "jwt-token-" + System.currentTimeMillis());
                        response.put("user", Map.of(
                            "id", user.getId(),
                            "username", user.getUsername(),
                            "email", user.getEmail(),
                            "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                            "role", user.getRole().name()
                        ));
                        log.info("用户 {} 登录成功", username);
                        return ResponseEntity.ok(response);
                    } else {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("message", "账户已被禁用");
                        return ResponseEntity.status(401).body(response);
                    }
                } else {
                    log.warn("用户 {} 密码验证失败", username);
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "用户名或密码错误");
                    return ResponseEntity.status(401).body(response);
                }
            } else {
                log.warn("登录失败，用户不存在: {}", username);
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "用户名或密码错误");
                return ResponseEntity.status(401).body(response);
            }
        } catch (Exception e) {
            log.error("登录验证异常", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "系统错误，请稍后重试");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "用户登出", description = "用户登出")
    public ResponseEntity<Map<String, Object>> logout() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "登出成功");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user")
    @Operation(summary = "获取当前用户信息", description = "获取当前登录用户信息")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("user", Map.of(
            "id", 1,
            "username", "admin",
            "role", "ADMIN"
        ));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前用户信息(兼容)", description = "兼容前端 /auth/me 路径")
    public ResponseEntity<Map<String, Object>> getCurrentUserMe() {
        return getCurrentUser();
    }

    @PostMapping("/refresh")
    @Operation(summary = "刷新令牌", description = "返回新的访问令牌")
    public ResponseEntity<Map<String, Object>> refreshToken() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "token刷新成功");
        response.put("token", "jwt-token-" + System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @Operation(summary = "修改密码", description = "已登录用户修改密码")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (username == null || oldPassword == null || newPassword == null) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "参数不完整");
            return ResponseEntity.badRequest().body(resp);
        }

        try {
            boolean ok = userService.changePassword(username, oldPassword, newPassword);
            Map<String, Object> resp = new HashMap<>();
            if (ok) {
                resp.put("success", true);
                resp.put("message", "密码修改成功");
                return ResponseEntity.ok(resp);
            }
            resp.put("success", false);
            resp.put("message", "原密码错误或用户不存在");
            return ResponseEntity.status(400).body(resp);
        } catch (Exception e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "系统错误，请稍后重试");
            return ResponseEntity.status(500).body(resp);
        }
    }

}

