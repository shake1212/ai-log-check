package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.ThreatSignatureRepository;
import com.security.ailogsystem.service.ThreatSignatureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreatSignatureServiceImpl implements ThreatSignatureService {

    private final ThreatSignatureRepository repository;

    @Value("${threat.signature.cache-ttl-seconds:300}")
    private long cacheTtlSeconds;

    private final AtomicReference<List<CachedSignature>> cachedSignatures = new AtomicReference<>(List.of());
    private volatile Instant cacheLoadedAt = Instant.EPOCH;

    @PostConstruct
    public void init() {
        refreshCache();
    }

    @Override
    public List<ThreatSignature> getActiveSignatures() {
        ensureCacheValid();
        return cachedSignatures.get().stream()
                .map(CachedSignature::signature)
                .toList();
    }

    @Override
    public Optional<SignatureMatch> matchSignatures(UnifiedSecurityEvent event) {
        ensureCacheValid();
        if (event == null) {
            return Optional.empty();
        }

        String eventText = buildEventText(event);
        for (CachedSignature cachedSignature : cachedSignatures.get()) {
            if (matches(cachedSignature, event, eventText)) {
                ThreatSignature signature = cachedSignature.signature();
                double score = signature.getScore() != null ? signature.getScore() : 0.75;
                String reason = String.format("命中特征[%s]%s",
                        signature.getName(),
                        StringUtils.hasText(signature.getThreatType()) ? " - " + signature.getThreatType() : "");
                updateHitStatistics(signature);
                return Optional.of(new SignatureMatch(signature, score, reason));
            }
        }

        return Optional.empty();
    }

    @Override
    public synchronized void refreshCache() {
        List<ThreatSignature> signatures = repository.findByEnabledTrue();
        List<CachedSignature> cached = signatures.stream()
                .map(CachedSignature::from)
                .toList();
        cachedSignatures.set(cached);
        cacheLoadedAt = Instant.now();
        log.info("已加载 {} 条启用的威胁特征", cached.size());
    }

    private void ensureCacheValid() {
        if (Duration.between(cacheLoadedAt, Instant.now()).getSeconds() > cacheTtlSeconds) {
            refreshCache();
        }
    }

    private boolean matches(CachedSignature cachedSignature, UnifiedSecurityEvent event, String text) {
        ThreatSignature signature = cachedSignature.signature();
        String category = Optional.ofNullable(signature.getCategory()).orElse("KEYWORD").toUpperCase(Locale.ROOT);

        return switch (category) {
            case "EVENT_ID" -> event.getEventCode() != null &&
                    String.valueOf(event.getEventCode()).equals(signature.getPattern());
            case "PORT" -> matchesPort(event, signature.getPattern());
            case "IP" -> matchesIp(event, signature.getPattern());
            case "BEHAVIOR" -> containsIgnoreCase(text, signature.getPattern());
            default -> matchPattern(cachedSignature, text);
        };
    }

    private boolean matchPattern(CachedSignature cachedSignature, String text) {
        String patternType = Optional.ofNullable(cachedSignature.signature().getPatternType())
                .orElse("KEYWORD")
                .toUpperCase(Locale.ROOT);
        String pattern = cachedSignature.signature().getPattern();

        if (!StringUtils.hasText(pattern)) {
            return false;
        }

        return switch (patternType) {
            case "EXACT" -> pattern.equalsIgnoreCase(text);
            case "REGEX" -> cachedSignature.compiledPattern() != null &&
                    cachedSignature.compiledPattern().matcher(text).find();
            default -> containsIgnoreCase(text, pattern);
        };
    }

    private boolean matchesPort(UnifiedSecurityEvent event, String pattern) {
        if (!StringUtils.hasText(pattern)) {
            return false;
        }
        try {
            int port = Integer.parseInt(pattern.trim());
            return (event.getSourcePort() != null && event.getSourcePort() == port) ||
                    (event.getDestinationPort() != null && event.getDestinationPort() == port);
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private boolean matchesIp(UnifiedSecurityEvent event, String pattern) {
        if (!StringUtils.hasText(pattern)) {
            return false;
        }
        return pattern.equalsIgnoreCase(Optional.ofNullable(event.getSourceIp()).orElse(""))
                || pattern.equalsIgnoreCase(Optional.ofNullable(event.getDestinationIp()).orElse(""));
    }

    private String buildEventText(UnifiedSecurityEvent event) {
        StringBuilder builder = new StringBuilder();
        if (StringUtils.hasText(event.getNormalizedMessage())) {
            builder.append(event.getNormalizedMessage()).append(" ");
        }
        if (StringUtils.hasText(event.getRawMessage())) {
            builder.append(event.getRawMessage()).append(" ");
        }
        if (StringUtils.hasText(event.getRawData())) {
            builder.append(event.getRawData()).append(" ");
        }
        if (event.getEventData() != null && !event.getEventData().isEmpty()) {
            builder.append(event.getEventData().toString());
        }
        return builder.toString();
    }

    private boolean containsIgnoreCase(String text, String keyword) {
        return StringUtils.hasText(text) &&
                StringUtils.hasText(keyword) &&
                text.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    private void updateHitStatistics(ThreatSignature signature) {
        try {
            Long currentHit = signature.getHitCount() != null ? signature.getHitCount() : 0L;
            signature.setHitCount(currentHit + 1);
            signature.setLastHitTime(LocalDateTime.now());
            repository.save(signature);
        } catch (Exception e) {
            log.debug("更新特征库命中统计失败: {}", e.getMessage());
        }
    }

    private record CachedSignature(ThreatSignature signature, Pattern compiledPattern) {
        static CachedSignature from(ThreatSignature signature) {
            Pattern pattern = null;
            if ("REGEX".equalsIgnoreCase(signature.getPatternType()) && StringUtils.hasText(signature.getPattern())) {
                try {
                    pattern = Pattern.compile(signature.getPattern(), Pattern.CASE_INSENSITIVE);
                } catch (Exception ex) {
                    log.warn("编译特征正则失败[{}]: {}", signature.getName(), ex.getMessage());
                }
            }
            return new CachedSignature(signature, pattern);
        }
    }
}

