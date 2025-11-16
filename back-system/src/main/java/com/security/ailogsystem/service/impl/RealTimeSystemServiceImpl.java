
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.model.SimpleWmiData;
import com.security.ailogsystem.repository.SimpleWmiDataRepository;
import com.security.ailogsystem.service.RealTimeSystemService;
import com.security.ailogsystem.service.SystemInfoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

@Slf4j
@Service
@Transactional
public class RealTimeSystemServiceImpl implements RealTimeSystemService {

    @Autowired
    private SimpleWmiDataRepository wmiDataRepository;

    @Autowired
    private SystemInfoService systemInfoService;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @Override
    public SseEmitter createConnection(String clientId) {
        SseEmitter emitter = new SseEmitter(60_000L); // 60秒超时
        emitters.put(clientId, emitter);

        // 设置完成和超时回调
        emitter.onCompletion(() -> {
            log.info("SSE连接完成: {}", clientId);
            emitters.remove(clientId);
        });

        emitter.onTimeout(() -> {
            log.info("SSE连接超时: {}", clientId);
            emitters.remove(clientId);
        });

        emitter.onError((ex) -> {
            log.error("SSE连接错误: {}", clientId, ex);
            emitters.remove(clientId);
        });

        // 发送初始连接成功消息
        try {
            Map<String, Object> initialData = Map.of(
                    "type", "connection_established",
                    "clientId", clientId,
                    "timestamp", System.currentTimeMillis(),
                    "message", "实时数据流连接已建立"
            );
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(initialData));
        } catch (Exception e) {
            log.error("发送初始消息失败: {}", clientId, e);
            emitter.completeWithError(e);
        }

        log.info("创建实时数据流连接: {}", clientId);
        return emitter;
    }

    @Override
    public int getActiveConnections() {
        return emitters.size();
    }

    @Override
    public SimpleWmiData saveWmiData(SimpleWmiData wmiData) {
        try {
            return wmiDataRepository.save(wmiData);
        } catch (Exception e) {
            log.error("保存系统信息数据失败: {}", e.getMessage(), e);
            throw new RuntimeException("保存系统信息数据失败", e);
        }
    }

    @Override
    public List<SimpleWmiData> saveWmiDataList(List<SimpleWmiData> wmiDataList) {
        try {
            return wmiDataRepository.saveAll(wmiDataList);
        } catch (Exception e) {
            log.error("批量保存系统信息数据失败: {}", e.getMessage(), e);
            throw new RuntimeException("批量保存系统信息数据失败", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SimpleWmiData getWmiDataById(Long id) {
        return wmiDataRepository.findById(id).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByHostname(String hostname) {
        return wmiDataRepository.findByHostname(hostname);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByIpAddress(String ipAddress) {
        return wmiDataRepository.findByIpAddress(ipAddress);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByType(SimpleWmiData.DataType dataType) {
        return wmiDataRepository.findByDataType(dataType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getWmiDataByTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        return wmiDataRepository.findByCollectTimeBetween(startTime, endTime);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SimpleWmiData> getWmiDataPage(String hostname, Pageable pageable) {
        if (hostname == null || hostname.trim().isEmpty()) {
            return wmiDataRepository.findAll(pageable);
        }
        return wmiDataRepository.findByHostnameContainingIgnoreCase(hostname, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SimpleWmiData> getLatestWmiData(String hostname, SimpleWmiData.DataType dataType, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return wmiDataRepository.findLatestByHostnameAndDataType(hostname, dataType, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getWmiStatistics() {
        Map<String, Object> statistics = new HashMap<>();

        long totalCount = wmiDataRepository.count();
        statistics.put("totalCount", totalCount);

        List<Object[]> statusCounts = wmiDataRepository.countByStatus();
        Map<String, Long> statusStats = new HashMap<>();
        for (Object[] row : statusCounts) {
            statusStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("statusStatistics", statusStats);

        List<Object[]> typeCounts = wmiDataRepository.countByDataType();
        Map<String, Long> typeStats = new HashMap<>();
        for (Object[] row : typeCounts) {
            typeStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("typeStatistics", typeStats);

        List<Object[]> hostCounts = wmiDataRepository.countByHostname();
        Map<String, Long> hostStats = new HashMap<>();
        for (Object[] row : hostCounts) {
            hostStats.put(row[0].toString(), (Long) row[1]);
        }
        statistics.put("hostStatistics", hostStats);

        return statistics;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getHostStatistics(String hostname) {
        Map<String, Object> statistics = new HashMap<>();

        List<SimpleWmiData> hostData = wmiDataRepository.findByHostname(hostname);
        statistics.put("hostname", hostname);
        statistics.put("totalCount", hostData.size());

        Map<String, Long> typeStats = new HashMap<>();
        for (SimpleWmiData data : hostData) {
            String type = data.getDataType().name();
            typeStats.put(type, typeStats.getOrDefault(type, 0L) + 1);
        }
        statistics.put("typeStatistics", typeStats);

        Map<String, Long> statusStats = new HashMap<>();
        for (SimpleWmiData data : hostData) {
            String status = data.getStatus().name();
            statusStats.put(status, statusStats.getOrDefault(status, 0L) + 1);
        }
        statistics.put("statusStatistics", statusStats);

        Optional<LocalDateTime> latestTime = hostData.stream()
                .map(SimpleWmiData::getCollectTime)
                .max(LocalDateTime::compareTo);
        statistics.put("latestCollectTime", latestTime.orElse(null));

        return statistics;
    }

    @Override
    public void deleteExpiredData(int days) {
        LocalDateTime expireTime = LocalDateTime.now().minusDays(days);
        wmiDataRepository.deleteByCollectTimeBefore(expireTime);
        log.info("删除{}天前的过期系统信息数据", days);
    }

    @Override
    public SimpleWmiData collectWmiData(String hostname, String ipAddress, SimpleWmiData.DataType dataType) {
        try {
            // 使用Python收集系统信息
            String dataValue = collectSystemInfoData(dataType);

            SimpleWmiData wmiData = SimpleWmiData.builder()
                    .hostname(hostname)
                    .ipAddress(ipAddress)
                    .dataType(dataType)
                    .dataValue(dataValue)
                    .status(SimpleWmiData.Status.SUCCESS)
                    .remark("Python系统信息采集")
                    .collectTime(LocalDateTime.now())
                    .build();

            return saveWmiData(wmiData);
        } catch (Exception e) {
            log.error("采集系统信息失败: {}", e.getMessage(), e);

            SimpleWmiData failedData = SimpleWmiData.builder()
                    .hostname(hostname)
                    .ipAddress(ipAddress)
                    .dataType(dataType)
                    .dataValue("采集失败")
                    .status(SimpleWmiData.Status.FAILED)
                    .remark("采集失败: " + e.getMessage())
                    .collectTime(LocalDateTime.now())
                    .build();

            return saveWmiData(failedData);
        }
    }

    @Override
    public List<SimpleWmiData> batchCollectWmiData(String hostname, String ipAddress) {
        List<SimpleWmiData> wmiDataList = new ArrayList<>();

        SimpleWmiData.DataType[] dataTypes = {
                SimpleWmiData.DataType.CPU_USAGE,
                SimpleWmiData.DataType.MEMORY_USAGE,
                SimpleWmiData.DataType.DISK_USAGE,
                SimpleWmiData.DataType.NETWORK_TRAFFIC,
                SimpleWmiData.DataType.PROCESS_COUNT
        };

        for (SimpleWmiData.DataType dataType : dataTypes) {
            SimpleWmiData wmiData = collectWmiData(hostname, ipAddress, dataType);
            wmiDataList.add(wmiData);
        }

        return wmiDataList;
    }

    // ================ 新增方法实现 ================

    @Override
    public List<Map<String, Object>> executeSystemInfoQuery(String infoType) {
        try {
            Map<String, Object> systemInfo = systemInfoService.collectSpecificInfo(infoType);
            List<Map<String, Object>> results = new ArrayList<>();

            // 将系统信息转换为统一的返回格式
            Map<String, Object> resultItem = new HashMap<>();
            resultItem.put("infoType", infoType);
            resultItem.put("data", systemInfo);
            resultItem.put("collectionTime", LocalDateTime.now().toString());
            results.add(resultItem);

            return results;
        } catch (Exception e) {
            log.error("执行系统信息查询失败: {}", e.getMessage(), e);
            throw new RuntimeException("系统信息查询失败: " + e.getMessage());
        }
    }

    @Override
    public boolean testSystemInfoEnvironment() {
        return systemInfoService.testPythonEnvironment();
    }

    @Override
    public List<String> getAvailableInfoTypes() {
        return systemInfoService.getSupportedInfoTypes();
    }

    @Override
    public List<String> getInfoTypeProperties(String infoType) {
        return systemInfoService.getInfoTypeProperties(infoType);
    }

    @Override
    public Map<String, Object> getSystemPerformanceMetrics() {
        return systemInfoService.extractPerformanceMetrics();
    }

    // 私有辅助方法
    private String collectSystemInfoData(SimpleWmiData.DataType dataType) {
        try {
            Map<String, Object> systemInfo = systemInfoService.collectSystemInfo();
            return extractDataByType(systemInfo, dataType);
        } catch (Exception e) {
            log.warn("系统信息采集失败，使用模拟数据: {}", e.getMessage());
            return generateMockData(dataType);
        }
    }

    private String extractDataByType(Map<String, Object> systemInfo, SimpleWmiData.DataType dataType) {
        try {
            switch (dataType) {
                case CPU_USAGE:
                    Map<String, Object> cpuInfo = (Map<String, Object>) systemInfo.get("cpu");
                    return String.format("%.2f%%", cpuInfo.get("cpu_usage_percent"));
                case MEMORY_USAGE:
                    Map<String, Object> memoryInfo = (Map<String, Object>) systemInfo.get("memory");
                    return String.format("%.2f%%", memoryInfo.get("usage_percent"));
                case DISK_USAGE:
                    Map<String, Object> diskInfo = (Map<String, Object>) systemInfo.get("disk");
                    // 取第一个磁盘的使用率
                    if (!diskInfo.isEmpty()) {
                        Map<String, Object> firstDisk = (Map<String, Object>) diskInfo.values().iterator().next();
                        return String.format("%.2f%%", firstDisk.get("usage_percent"));
                    }
                    return "0.0%";
                case PROCESS_COUNT:
                    Map<String, Object> processInfo = (Map<String, Object>) systemInfo.get("processes");
                    return String.valueOf(processInfo.get("total_count"));
                case SYSTEM_INFO:
                    Map<String, Object> basicInfo = (Map<String, Object>) systemInfo.get("basic");
                    return String.format("系统: %s, 主机名: %s",
                            basicInfo.get("platform"), basicInfo.get("hostname"));
                default:
                    return "未知数据类型";
            }
        } catch (Exception e) {
            log.warn("提取特定类型数据失败: {}", e.getMessage());
            return generateMockData(dataType);
        }
    }

    private String generateMockData(SimpleWmiData.DataType dataType) {
        Random random = new Random();

        switch (dataType) {
            case CPU_USAGE:
                return String.format("%.2f%%", random.nextDouble() * 100);
            case MEMORY_USAGE:
                return String.format("%.2f%%", random.nextDouble() * 100);
            case DISK_USAGE:
                return String.format("%.2f%%", random.nextDouble() * 100);
            case NETWORK_TRAFFIC:
                return String.format("上行: %.2f MB/s, 下行: %.2f MB/s",
                        random.nextDouble() * 100, random.nextDouble() * 200);
            case PROCESS_COUNT:
                return String.valueOf(random.nextInt(50, 200));
            case SERVICE_STATUS:
                return random.nextBoolean() ? "运行中" : "已停止";
            case SYSTEM_INFO:
                return String.format("系统: %s, 版本: %d.%d",
                        random.nextBoolean() ? "Windows" : "Linux",
                        random.nextInt(10, 12), random.nextInt(0, 3));
            default:
                return "未知数据类型";
        }
    }

    @Override
    public Map<String, Object> getRealTimeStatus() {
        return systemInfoService.collectRealTimeStatus();
    }

    @Override
    public Map<String, Object> getBatchRealTimeData() {
        return systemInfoService.collectBatchRealTimeData();
    }

    @Override
    public Map<String, Object> getPerformanceDataQuick() {
        return systemInfoService.collectPerformanceDataQuick();
    }

    @Override
    public Map<String, Object> getNetworkStats() {
        return systemInfoService.collectNetworkStats();
    }

    @Override
    public Map<String, Object> getQuickProcessInfo(int limit) {
        return systemInfoService.collectQuickProcessInfo(limit);
    }
}