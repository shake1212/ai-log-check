package com.security.ailogsystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.security.ailogsystem.dto.TrafficStatsDTO;
import com.security.ailogsystem.repository.SecurityLogRepository;

import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrafficStatsService {

    private final SecurityLogRepository securityLogRepository;

    public TrafficStatsDTO getTrafficStats() {
        try {
            TrafficStatsDTO stats = new TrafficStatsDTO();

            // 1. 正常流量 - 基于数据库统计
            stats.setNormalTraffic(calculateNormalTraffic());

            // 2. 异常流量 - 基于异常日志统计
            stats.setAnomalyTraffic(calculateAnomalyTraffic());

            // 3. 峰值流量
            stats.setPeakTraffic(calculatePeakTraffic(stats.getNormalTraffic()));

            // 4. 平均延迟
            stats.setAvgLatency(calculateAvgLatency());

            // 5. 当前流量
            stats.setCurrentTraffic(calculateCurrentTraffic());

            return stats;

        } catch (Exception e) {
            log.error("获取流量统计数据失败", e);
            return getDefaultTrafficStats();
        }
    }

    private Double calculateNormalTraffic() {
        try {
            LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
            Long normalCount = securityLogRepository.countByThreatLevelAndEventTimeAfter("LOW", oneMinuteAgo);

            if (normalCount != null) {
                return normalCount.doubleValue();
            }
        } catch (Exception e) {
            log.warn("无法从数据库获取正常流量", e);
        }

        // 模拟数据
        return 1250.0 + ThreadLocalRandom.current().nextDouble(200);
    }

    private Double calculateAnomalyTraffic() {
        try {
            LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
            Long anomalyCount = securityLogRepository.countByThreatLevelInAndEventTimeAfter(
                    java.util.Arrays.asList("MEDIUM", "HIGH", "CRITICAL"),
                    oneMinuteAgo
            );

            if (anomalyCount != null) {
                return anomalyCount.doubleValue();
            }
        } catch (Exception e) {
            log.warn("无法从数据库获取异常流量", e);
        }

        // 模拟数据
        return 45.0 + ThreadLocalRandom.current().nextDouble(20);
    }

    private Double calculatePeakTraffic(Double normalTraffic) {
        // 峰值通常是正常流量的1.5倍左右
        return normalTraffic * 1.5 + ThreadLocalRandom.current().nextDouble(100);
    }

    private Double calculateAvgLatency() {
        // 模拟延迟
        return 78.0 + ThreadLocalRandom.current().nextDouble(20);
    }

    private Double calculateCurrentTraffic() {
        try {
            LocalDateTime tenSecondsAgo = LocalDateTime.now().minusSeconds(10);
            Long recentCount = securityLogRepository.countByEventTimeAfter(tenSecondsAgo);

            if (recentCount != null) {
                // 转换为每分钟流量
                return recentCount.doubleValue() * 6;
            }
        } catch (Exception e) {
            log.warn("无法从数据库获取当前流量", e);
        }

        // 模拟数据
        return 850.0 + ThreadLocalRandom.current().nextDouble(200);
    }

    private TrafficStatsDTO getDefaultTrafficStats() {
        TrafficStatsDTO stats = new TrafficStatsDTO();
        stats.setNormalTraffic(1250.0);
        stats.setAnomalyTraffic(45.0);
        stats.setPeakTraffic(1920.0);
        stats.setAvgLatency(78.0);
        stats.setCurrentTraffic(850.0);
        return stats;
    }
}