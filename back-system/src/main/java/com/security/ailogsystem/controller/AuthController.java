package com.security.ailogsystem.controller;

import com.security.ailogsystem.config.JwtUtil;
import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.jsonwebtoken.Claims;
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
    private final JwtUtil jwtUtil;

    @Autowired
    public AuthController(UserService userService, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
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

                boolean passwordValid = false;
                if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                    String stored = user.getPassword();
                    if (stored.startsWith("$2")) {
                        try {
                            passwordValid = userService.validatePassword(password, stored);
                        } catch (Exception e) {
                            log.warn("BCrypt 验证异常: {}", e.getMessage());
                        }
                    }
                    if (!passwordValid) {
                        log.warn("用户 {} 密码验证失败", username);
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("message", "用户名或密码错误");
                        return ResponseEntity.status(401).body(response);
                    }
                }

                if (passwordValid) {
                    if (user.getIsActive() != null && user.getIsActive()) {
                        userService.updateLastLogin(username);
                        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        response.put("message", "登录成功");
                        response.put("token", token);
                        Map<String, Object> userInfo = new HashMap<>();
                        userInfo.put("id", user.getId());
                        userInfo.put("username", user.getUsername());
                        userInfo.put("email", user.getEmail());
                        userInfo.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
                        userInfo.put("role", user.getRole().name().toLowerCase());
                        response.put("user", userInfo);
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
                log.warn("登录失败: {}", username);
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
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        User user = resolveUserFromToken(authHeader);
        if (user == null) {
            response.put("success", false);
            response.put("message", "未认证");
            return ResponseEntity.status(401).body(response);
        }
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        userInfo.put("role", user.getRole().name().toLowerCase());
        response.put("success", true);
        response.put("user", userInfo);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前用户信息(兼容)", description = "兼容前端 /auth/me 路径")
    public ResponseEntity<Map<String, Object>> getCurrentUserMe(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return getCurrentUser(authHeader);
    }

    @PostMapping("/refresh")
    @Operation(summary = "刷新令牌", description = "返回新的访问令牌")
    public ResponseEntity<Map<String, Object>> refreshToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        User user = resolveUserFromToken(authHeader);
        if (user == null) {
            response.put("success", false);
            response.put("message", "未认证或Token无效");
            return ResponseEntity.status(401).body(response);
        }
        String newToken = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        response.put("success", true);
        response.put("message", "token刷新成功");
        response.put("token", newToken);
        return ResponseEntity.ok(response);
    }

    private User resolveUserFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authHeader.substring(7);
        // 优先标准 JWT
        if (jwtUtil.validateToken(token)) {
            try {
                String username = jwtUtil.getUsername(token);
                return userService.findByUsername(username).orElse(null);
            } catch (Exception e) {
                return null;
            }
        }
        // 兼容旧格式 jwt-token-{username}-{timestamp}
        if (token.startsWith("jwt-token-")) {
            String payload = token.substring(10);
            int lastDash = payload.lastIndexOf('-');
            if (lastDash <= 0) return null;
            try {
                long issuedAt = Long.parseLong(payload.substring(lastDash + 1));
                if (System.currentTimeMillis() - issuedAt > 24 * 60 * 60 * 1000L) return null;
                String username = payload.substring(0, lastDash);
                return userService.findByUsername(username).orElse(null);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    @PostMapping("/validate")
    @Operation(summary = "验证令牌", description = "验证访问令牌是否有效")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.put("valid", false);
            response.put("message", "缺少或无效的Authorization header");
            return ResponseEntity.status(401).body(response);
        }

        String token = authHeader.substring(7);

        // 优先标准 JWT
        if (jwtUtil.validateToken(token)) {
            try {
                String username = jwtUtil.getUsername(token);
                Optional<User> userOpt = userService.findByUsername(username);
                if (!userOpt.isPresent()) {
                    response.put("valid", false);
                    response.put("message", "用户不存在");
                    return ResponseEntity.status(401).body(response);
                }
                User user = userOpt.get();
                if (user.getIsActive() == null || !user.getIsActive()) {
                    response.put("valid", false);
                    response.put("message", "账户已被禁用");
                    return ResponseEntity.status(401).body(response);
                }
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("username", user.getUsername());
                userInfo.put("role", user.getRole().name().toLowerCase());
                response.put("valid", true);
                response.put("message", "Token有效");
                response.put("user", userInfo);
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                log.error("JWT验证异常", e);
                response.put("valid", false);
                response.put("message", "验证失败");
                return ResponseEntity.status(500).body(response);
            }
        }

        // 兼容旧格式
        if (token.startsWith("jwt-token-")) {
            try {
                String payload = token.substring(10);
                int lastDash = payload.lastIndexOf('-');
                if (lastDash <= 0) {
                    response.put("valid", false);
                    response.put("message", "无效的Token格式");
                    return ResponseEntity.status(401).body(response);
                }
                String username = payload.substring(0, lastDash);
                String timestampStr = payload.substring(lastDash + 1);
                long timestamp = Long.parseLong(timestampStr);
                long currentTime = System.currentTimeMillis();
                long expirationTime = 24 * 60 * 60 * 1000L;

                if (currentTime - timestamp >= expirationTime) {
                    response.put("valid", false);
                    response.put("message", "Token已过期");
                    log.warn("Token已过期，用户: {}", username);
                    return ResponseEntity.status(401).body(response);
                }

                Optional<User> userOpt = userService.findByUsername(username);
                if (!userOpt.isPresent()) {
                    response.put("valid", false);
                    response.put("message", "用户不存在");
                    return ResponseEntity.status(401).body(response);
                }

                User user = userOpt.get();
                if (user.getIsActive() == null || !user.getIsActive()) {
                    response.put("valid", false);
                    response.put("message", "账户已被禁用");
                    return ResponseEntity.status(401).body(response);
                }

                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("username", user.getUsername());
                userInfo.put("role", user.getRole().name().toLowerCase());

                response.put("valid", true);
                response.put("message", "Token有效");
                response.put("user", userInfo);
                return ResponseEntity.ok(response);

            } catch (NumberFormatException e) {
                response.put("valid", false);
                response.put("message", "Token格式错误");
                return ResponseEntity.status(401).body(response);
            } catch (Exception e) {
                log.error("Token验证异常", e);
                response.put("valid", false);
                response.put("message", "验证失败");
                return ResponseEntity.status(500).body(response);
            }
        }

        response.put("valid", false);
        response.put("message", "无效的Token格式");
        return ResponseEntity.status(401).body(response);
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
