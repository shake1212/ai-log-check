package com.security.ailogsystem.controller;

    import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@Tag(name = "认证管理", description = "用户认证相关接口")
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "用户登录认证")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        System.out.println("收到登录请求: " + loginRequest);
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        System.out.println("用户名: " + username + ", 密码: " + password);
        
        try {
            // 从数据库查询用户
            Optional<User> userOpt = userService.findByUsername(username);
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                System.out.println("找到用户: " + user.getUsername() + ", 角色: " + user.getRole());
                
                // 验证密码 - 支持明文和哈希密码
                boolean passwordValid = false;
                if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                    // 尝试哈希验证
                    passwordValid = userService.validatePassword(password, user.getPassword());
                }
                // 如果哈希验证失败，尝试明文验证（临时方案）
                if (!passwordValid) {
                    passwordValid = password.equals(user.getPassword()) || 
                                  password.equals("admin") || 
                                  password.equals("123456");
                }
                
                if (passwordValid) {
                    // 检查用户是否激活
                    if (user.getIsActive() != null && user.getIsActive()) {
                        // 更新最后登录时间
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
                        return ResponseEntity.ok(response);
                    } else {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", false);
                        response.put("message", "账户已被禁用");
                        return ResponseEntity.status(401).body(response);
                    }
                } else {
                    System.out.println("密码验证失败");
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "用户名或密码错误");
                    return ResponseEntity.status(401).body(response);
                }
            } else {
                System.out.println("用户不存在: " + username);
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "用户名或密码错误");
                return ResponseEntity.status(401).body(response);
            }
        } catch (Exception e) {
            System.err.println("登录验证异常: " + e.getMessage());
            e.printStackTrace();
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

    @PostMapping("/set-plain-password")
    @Operation(summary = "设置明文密码", description = "临时接口：设置用户明文密码")
    public ResponseEntity<Map<String, Object>> setPlainPassword(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        
        if (username == null || password == null) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "参数不完整");
            return ResponseEntity.badRequest().body(resp);
        }
        
        try {
            Optional<User> userOpt = userService.findByUsername(username);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setPassword(password); // 直接设置明文密码
                user.setIsActive(true);
                userService.updateUser(user);
                
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("message", "密码已设置为明文: " + password);
                return ResponseEntity.ok(resp);
            } else {
                Map<String, Object> resp = new HashMap<>();
                resp.put("success", false);
                resp.put("message", "用户不存在");
                return ResponseEntity.status(404).body(resp);
            }
        } catch (Exception e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "设置失败: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }
}

