package com.security.ailogsystem.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * 简单 Token 认证过滤器
 * 验证 Authorization: Bearer jwt-token-{timestamp} 格式令牌
 * token 有效期 24 小时
 */
@Component
public class TokenAuthFilter extends OncePerRequestFilter {

    private static final long TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000L;
    private static final String TOKEN_PREFIX = "jwt-token-";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer " + TOKEN_PREFIX)) {
            String timestampStr = header.substring(("Bearer " + TOKEN_PREFIX).length());
            try {
                long issuedAt = Long.parseLong(timestampStr);
                long now = System.currentTimeMillis();
                if (now - issuedAt <= TOKEN_VALIDITY_MS) {
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    "user", null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (NumberFormatException ignored) {
                // 无效 token 格式，不设置认证，后续由 Spring Security 拦截
            }
        }
        filterChain.doFilter(request, response);
    }
}
