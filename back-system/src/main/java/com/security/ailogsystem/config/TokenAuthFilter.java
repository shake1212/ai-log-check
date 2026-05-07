package com.security.ailogsystem.config;

import com.security.ailogsystem.model.User;
import com.security.ailogsystem.service.UserService;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class TokenAuthFilter extends OncePerRequestFilter {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    public TokenAuthFilter(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            // 先尝试标准 JWT 解析
            if (jwtUtil.validateToken(token)) {
                try {
                    String username = jwtUtil.getUsername(token);
                    String role = jwtUtil.getRole(token);
                    Optional<User> userOpt = userService.findByUsername(username);
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();
                        if (user.getIsActive() != null && user.getIsActive()) {
                            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(username, null, authorities);
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        }
                    }
                } catch (Exception ignored) {
                }
            }
            // 兼容旧格式 jwt-token-{username}-{timestamp}，过渡期结束后移除
            else if (token.startsWith("jwt-token-")) {
                try {
                    String payload = token.substring(10);
                    int lastDash = payload.lastIndexOf('-');
                    if (lastDash > 0) {
                        long issuedAt = Long.parseLong(payload.substring(lastDash + 1));
                        if (System.currentTimeMillis() - issuedAt <= 24 * 60 * 60 * 1000L) {
                            String username = payload.substring(0, lastDash);
                            Optional<User> userOpt = userService.findByUsername(username);
                            if (userOpt.isPresent()) {
                                User user = userOpt.get();
                                if (user.getIsActive() != null && user.getIsActive()) {
                                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                                    authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                                    authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                                    UsernamePasswordAuthenticationToken auth =
                                            new UsernamePasswordAuthenticationToken(username, null, authorities);
                                    SecurityContextHolder.getContext().setAuthentication(auth);
                                }
                            }
                        }
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
