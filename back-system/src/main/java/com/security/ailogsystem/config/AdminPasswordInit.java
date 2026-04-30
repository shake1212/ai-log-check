package com.security.ailogsystem.config;

import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 启动时检查 admin 账户密码是否为有效 BCrypt 哈希，
 * 若不是则自动重置为默认密码并激活账户。
 */
@Component
public class AdminPasswordInit implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminPasswordInit.class);
    private static final String DEFAULT_PASSWORD = "123456";

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public AdminPasswordInit(UserService userService, PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Optional<User> adminOpt = userService.findByUsername("admin");
            if (adminOpt.isEmpty()) {
                log.warn("admin 账户不存在，跳过密码初始化");
                return;
            }
            User admin = adminOpt.get();
            String pwd = admin.getPassword();
            boolean needsUpdate = false;

            // 检查密码是否为有效 BCrypt 哈希（完整格式至少 60 字符）
            if (pwd == null || !pwd.startsWith("$2") || pwd.length() < 60) {
                log.info("admin 密码无效或损坏（当前值: {}），重置为默认密码", pwd != null ? pwd.substring(0, Math.min(10, pwd.length())) : "null");
                admin.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
                needsUpdate = true;
            }

            // 确保账户激活
            if (admin.getIsActive() == null || !admin.getIsActive()) {
                log.info("admin 账户未激活，自动激活");
                admin.setIsActive(true);
                needsUpdate = true;
            }

            if (needsUpdate) {
                userService.updateUser(admin);
                log.info("admin 账户已更新，可使用默认密码登录");
            }
        } catch (Exception e) {
            log.error("admin 密码初始化失败", e);
        }
    }
}
